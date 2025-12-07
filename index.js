import express from "express";
import multer from "multer";
import cors from "cors";
import fetch from "node-fetch";
import { v2 as cloudinary } from "cloudinary";

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------
// CONFIG
// --------------------------
const JSONBIN_MASTER_KEY = "$2a$10$xSp4u1Y3iLb5bmRCQyG4WOtKRJELsKS3BAzd7O72PJcpOhtlNVrji";

const EVENTS_BIN = "6934b021ae596e708f882d96";
const SERMONS_BIN = "6934b00643b1c97be9dc6e37";

cloudinary.config({
  cloud_name: "dgzyfeumy",
  api_key: "864314542448916",
  api_secret: "GcWRtYUdPXxcjNILw89oiUG09Zo"
});

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --------------------------
// HELPERS
// --------------------------

async function getBin(binId) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    method: "GET",
    headers: {
      "X-Master-Key": JSONBIN_MASTER_KEY
    }
  });
  const data = await res.json();
  return data.record;
}

async function updateBin(binId, newData) {
  await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_MASTER_KEY
    },
    body: JSON.stringify(newData)
  });
}

// --------------------------
// CLOUDINARY UPLOADER
// --------------------------

async function uploadToCloudinary(fileBuffer) {
  return await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: "events" }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    }).end(fileBuffer);
  });
}

// --------------------------
// EVENTS ROUTES
// --------------------------

// GET ALL EVENTS
app.get("/events", async (req, res) => {
  const data = await getBin(EVENTS_BIN);
  res.json(data.events || []);
});

// CREATE EVENT
app.post("/events", upload.single("image"), async (req, res) => {
  try {
    const data = await getBin(EVENTS_BIN);

    let imageUrl = null;

    if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

    const newEvent = {
      id: Date.now().toString(),
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      image_path: imageUrl,
      created_at: new Date().toISOString()
    };

    data.events.push(newEvent);

    await updateBin(EVENTS_BIN, data);

    res.json({ success: true, event: newEvent });

  } catch (err) {
    res.status(500).json({ error: "Failed to save event", details: err.message });
  }
});

// EDIT EVENT
app.put("/events/:id", upload.single("image"), async (req, res) => {
  try {
    const data = await getBin(EVENTS_BIN);

    const id = req.params.id;
    let event = data.events.find(ev => ev.id === id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    let imageUrl = event.image_path;

    // If image replaced
    if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

    event.title = req.body.title;
    event.description = req.body.description;
    event.date = req.body.date;
    event.image_path = imageUrl;

    await updateBin(EVENTS_BIN, data);

    res.json({ success: true, event });

  } catch (err) {
    res.status(500).json({ error: "Failed to update event", details: err.message });
  }
});

// DELETE EVENT
app.delete("/events/:id", async (req, res) => {
  const data = await getBin(EVENTS_BIN);

  data.events = data.events.filter(ev => ev.id !== req.params.id);

  await updateBin(EVENTS_BIN, data);

  res.json({ success: true });
});

// --------------------------
// SERMONS ROUTES
// --------------------------

app.get("/sermons", async (req, res) => {
  const data = await getBin(SERMONS_BIN);
  res.json(data.sermons || []);
});

app.post("/sermons", async (req, res) => {
  try {
    const data = await getBin(SERMONS_BIN);

    const newSermon = {
      id: Date.now().toString(),
      title: req.body.title,
      preacher: req.body.preacher,
      date: req.body.date,
      youtube_url: req.body.youtube_url
    };

    data.sermons.push(newSermon);

    await updateBin(SERMONS_BIN, data);

    res.json({ success: true, sermon: newSermon });

  } catch (err) {
    res.status(500).json({ error: "Failed to save sermon", details: err.message });
  }
});

app.put("/sermons/:id", async (req, res) => {
  const data = await getBin(SERMONS_BIN);

  const sermon = data.sermons.find(s => s.id === req.params.id);
  if (!sermon) return res.status(404).json({ error: "Not found" });

  sermon.title = req.body.title;
  sermon.preacher = req.body.preacher;
  sermon.date = req.body.date;
  sermon.youtube_url = req.body.youtube_url;

  await updateBin(SERMONS_BIN, data);

  res.json({ success: true, sermon });
});

app.delete("/sermons/:id", async (req, res) => {
  const data = await getBin(SERMONS_BIN);
  data.sermons = data.sermons.filter(s => s.id !== req.params.id);

  await updateBin(SERMONS_BIN, data);

  res.json({ success: true });
});

// --------------------------
// SERVER
// --------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
