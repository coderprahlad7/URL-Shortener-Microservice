require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const shortid = require("shortid");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// mongoose.connect(database_uri,{ useNewUrlParser: true,useUnifiedTopology: true} );

mongoose
  .connect(process.env.env.name, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("Database connected!"))
  .catch(err => console.log(err));

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number,
});

let Url = mongoose.model("Url", urlSchema);

app.use(bodyParser.urlencoded({ extended: false }));

let responseObject = {};
app.post(
  "/api/shorturl/",
  bodyParser.urlencoded({ extended: false }),
  (request, response) => {
    let inputUrl = request.body["url"];

    let urlRegex = new RegExp(
      // /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi
      /^(http|https)(:\/\/)/
    );

    if (!inputUrl.match(urlRegex)) {
      response.json({ error: "Invalid URL" });
      return;
    }

    //     const httpRegex = /^(http|https)(:\/\/)/;
    // if (!httpRegex.test(responseObject)) {return response.json({ error: 'invalid url' })}
    responseObject["original_url"] = inputUrl;

    let inputShort = 1;

    Url.findOne({})
      .sort({ short: "desc" })
      .exec((error, result) => {
        if (!error && result != undefined) {
          inputShort = result.short + 1;
        }
        if (!error) {
          Url.findOneAndUpdate(
            { original: inputUrl },
            { original: inputUrl, short: inputShort },
            { new: true, upsert: true },
            (error, savedUrl) => {
              if (!error) {
                responseObject["short_url"] = savedUrl.short;
                response.json(responseObject);
              }
            }
          );
        }
      });
  }
);

app.get("/api/shorturl/:input", (request, response) => {
  let input = request.params.input;

  Url.findOne({ short: input }, (error, result) => {
    if (!error && result != undefined) {
      response.redirect(result.original);
    } else {
      response.json("URL not Found");
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
