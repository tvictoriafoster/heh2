const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
let propertiesReader = require("properties-reader");
const cors = require('cors');

const app = express();
const port = 5500;

//properties
console.log(__dirname);
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);

let dbPrefix = properties.get("db.prefix");
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");

const uri = dbPrefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

// Use Morgan middleware for logging
app.use(morgan('common'));

//REST API CODE
app.use(express.json());
app.use(cors());

app.param('collectionName', function (req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
});

app.get('/:collectionName', function (req, res, next) {
    req.collection.find({}).toArray(function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

// filter list - W
app.get('/:collectionName/:max/:sortAspect/:sortAscDesc', function (req, res, next) {
    // TODO: Validate params
    var max = parseInt(req.params.max, 10); // base 10
    let sortDirection = 1;
    if (req.params.sortAscDesc === "desc") {
        sortDirection = -1;
    }
    req.collection.find({}, {
        limit: max, sort: [[req.params.sortAspect,
            sortDirection]]
    }).toArray(function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

//find one - W
app.get('/:collectionName/:id', function (req, res, next) {
    req.collection.findOne({ lessonId: parseInt(req.params.id) }, function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});



//////////////////  POST    //////////////////////// - W
app.post('/:collectionName', function (req, res, next) {
    // TODO: Validate req.body
    req.collection.insertOne(req.body, function (err, results) {
        if (err) {
            return next(err);
        }
        res.send(results);
    });
});

//delete
app.delete('/:collectionName/:id', function (req, res, next) {
    req.collection.deleteOne(
        { _id: new ObjectId(req.params.id) }, function (err, result) {
            if (err) {
                return next(err);
            } else {
                res.send((result.deletedCount === 1) ? { msg: "success" } : { msg: "error" });
            }
        }
    );
});

//PUT update - W
app.put('/:collectionName/:id/:spacesTaken', function (req, res, next) {
    // TODO: Validate req.body
    req.collection.findOne({ lessonId: parseInt(req.params.id) }, function (err, results) {
        if (err) {
            return next(err);
        }
        let lesson = results;
        console.log(lesson);
        req.collection.updateOne({ _id: new Object(lesson._id) },
                    { $set: { space: (lesson.space - req.params.spacesTaken) } },
                    { safe: true, multi: false }, function (err, result) {
                        if (err) {
                            return next(err);
                        } else {
                            res.send((result.matchedCount == 1) ? { msg: "success" } : { msg: "error" });
                        }
                    }
                );
    });
});

// check static image exists - W
app.use('/:collectionName/:id/img', function (req, res, next) {
    req.collection.findOne({ lessonId: parseInt(req.params.id) }, function (err, results) {
        if (err) {
            return next(err);
        }
        var filePath = path.join(__dirname, "img", results.image);
        fs.stat(filePath, function (err, fileInfo) {
            if (err) {
                next();
                return;
            }
            if (fileInfo.isFile()) {
                res.sendFile(filePath);
            } else {
                next();
            }
        });
    });


});


// start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});