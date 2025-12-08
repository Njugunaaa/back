import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://elimkenya.org",
      "https://frontend-1-self.vercel.app"
    ]
  })
);

app.use(express.json({ limit: "15mb" })); // supports image uploads

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// JSONBin config
const JSONBIN_KEY = process.env.JSONBIN_MASTER_KEY;
const EVENTS_BIN = process.env.EVENTS_BIN;
const SERMONS_BIN = process.env.SERMONS_BIN;

const BIN_URL = (bin) => `https://api.jsonbin.io/v3/b/${bin}`;

// -----------------------------------------------------
// Helper: fetch bin
// -----------------------------------------------------
async function loadBin(binId) {
  const res = await axios.get(BIN_URL(binId), {
    headers: { "X-Master-Key": JSONBIN_KEY }
  });
  return res.data.record || [];
}

// -----------------------------------------------------
// Helper: overwrite bin
// -----------------------------------------------------
async function saveBin(binId, data) {
  await axios.put(
    BIN_URL(binId),
    data,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_KEY
      }
    }
  );
}

// -----------------------------------------------------
// Cloudinary upload helper
// -----------------------------------------------------
async function uploadImage(base64) {
  const upload = await cloudinary.uploader.upload(base64, {
    folder: "events_uploads",
    resource_type: "image"
  });

  return upload.secure_url;
}

// -----------------------------------------------------
// EVENTS ENDPOINTS
// -----------------------------------------------------

// Fetch all events
app.get("/api/events", async (req, res) => {
  try {
    const events = await loadBin(EVENTS_BIN);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Error loading events" });
  }
});

// Create event
app.post("/api/events", async (req, res) => {
  try {
    const { title, date, content, image } = req.body;

    let imageUrl = image;

    if (image && image.startsWith("data:")) {
      imageUrl = await uploadImage(image);
    }

    const events = await loadBin(EVENTS_BIN);

    const newEvent = {
      id: Date.now().toString(),
      title,
      date,
      content,
      image: imageUrl
    };

    events.push(newEvent);
    await saveBin(EVENTS_BIN, events);

    res.json(newEvent);
  } catch (err) {
    res.status(500).json({ error: "Failed to save event" });
  }
});

// Edit event
app.put("/api/events/:id", async (req, res) => {
  try {
    const events = await loadBin(EVENTS_BIN);
    const id = req.params.id;

    let imageUrl = req.body.image;
    if (req.body.image && req.body.image.startsWith("data:")) {
      imageUrl = await uploadImage(req.body.image);
    }

    const updated = events.map(ev =>
      ev.id === id ? { ...ev, ...req.body, image: imageUrl } : ev
    );

    await saveBin(EVENTS_BIN, updated);

    res.json({ message: "Event updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event
app.delete("/api/events/:id", async (req, res) => {
  try {
    const events = await loadBin(EVENTS_BIN);
    const filtered = events.filter(ev => ev.id !== req.params.id);
    await saveBin(EVENTS_BIN, filtered);
    res.json({ message: "Event deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// -----------------------------------------------------
// SERMONS ENDPOINTS
// -----------------------------------------------------

app.get("/api/sermons", async (req, res) => {
  try {
    const sermons = await loadBin(SERMONS_BIN);
    res.json(sermons);
  } catch {
    res.status(500).json({ error: "Error loading sermons" });
  }
});

app.post("/api/sermons", async (req, res) => {
  try {
    const { title, preacher, date, youtube } = req.body;

    const sermons = await loadBin(SERMONS_BIN);

    const newSermon = {
      id: Date.now().toString(),
      title,
      preacher,
      date,
      youtube
    };

    sermons.push(newSermon);
    await saveBin(SERMONS_BIN, sermons);

    res.json(newSermon);
  } catch {
    res.status(500).json({ error: "Failed to save sermon" });
  }
});

app.put("/api/sermons/:id", async (req, res) => {
  try {
    const sermons = await loadBin(SERMONS_BIN);
    const id = req.params.id;

    const updated = sermons.map(s =>
      s.id === id ? { ...s, ...req.body } : s
    );

    await saveBin(SERMONS_BIN, updated);
    res.json({ message: "Sermon updated" });
  } catch {
    res.status(500).json({ error: "Failed to update sermon" });
  }
});

app.delete("/api/sermons/:id", async (req, res) => {
  try {
    const sermons = await loadBin(SERMONS_BIN);
    const filtered = sermons.filter(s => s.id !== req.params.id);
    await saveBin(SERMONS_BIN, filtered);
    res.json({ message: "Sermon deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete sermon" });
  }
});

// -----------------------------------------------------

app.get("/", (req, res) => {
  res.json({ status: "Backend running fine." });
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);

