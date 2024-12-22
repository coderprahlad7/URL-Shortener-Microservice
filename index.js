require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const dns = require("dns");
const urlparser = require("url");

const app = express();
const port = process.env.PORT || 3000;

// MongoDB Client and Variables
const client = new MongoClient(process.env.DB_URL);
let db, urls;

// Ensure Database Connection Before Handling Requests
(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    db = client.db("url_shortner");
    urls = db.collection("urls");

    // Start the server only after DB connection is ready
    app.listen(port, function () {
      console.log(`Listening on port ${port}`);
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit process on database connection failure
  }
})();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// API Endpoint for URL Shortening
app.post("/api/shorturl", function (req, res) {
  console.log(req.body);

  const url = req.body.url;
  const hostname = urlparser.parse(url).hostname;

  if (!hostname) {
    return res.json({ error: "Invalid URL" });
  }

  dns.lookup(hostname, async (err, address) => {
    if (err || !address) {
      return res.json({ error: "Invalid URL" });
    }

    try {
      // Check for existing URL
      const existingUrl = await urls.findOne({ url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.url,
          short_url: existingUrl.short_url,
        });
      }

      // Create new short URL
      const urlCount = await urls.countDocuments({});
      const urlDoc = { url, short_url: urlCount + 1 };

      const result = await urls.insertOne(urlDoc);
      console.log(result);
      res.json({ original_url: url, short_url: urlDoc.short_url });
    } catch (err) {
      console.error("Error during URL processing:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
});

// Redirect to Original URL
app.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const shortUrl = parseInt(req.params.short_url, 10);
    const urlDoc = await urls.findOne({ short_url: shortUrl });

    if (!urlDoc) {
      return res
        .status(404)
        .json({ error: "No URL found for the given short URL" });
    }

    res.redirect(urlDoc.url);
  } catch (err) {
    console.error("Error during redirection:", err);
    res.status(500).json({ error: "Server error" });
  }
});
