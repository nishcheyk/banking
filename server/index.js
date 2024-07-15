// server.js or app.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const DocumentUpload = require("../server/models/DocumentUpload");
const auth = require("./routes/Auth");
const transaction = require(".routes/Transactions");
const customer = require(".routes/Customer");
const account = require(".routes/Accounts");
const emailOtp = require(".routes/EmailOtp");
const download = require(".routes/DownloadStatement");
const uploadRoutes = require(".routes/UploadRoutes");

const app = express();
const PORT = 5050;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("uploads"));

// MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/Bank-Management", {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG are allowed."
      )
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: fileFilter,
});

// Endpoint to handle file upload
app.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).send("File size exceeds the 2MB limit.");
        }
      } else if (err.message) {
        return res.status(400).send(err.message);
      }
      return res.status(400).send("File upload failed.");
    }
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const { documentType } = req.body;

    // Save document info to MongoDB
    const newDocument = new DocumentUpload({
      documentType,
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
    });

    try {
      await newDocument.save();
      res.json({
        message: "File uploaded successfully!",
        document: newDocument,
      });
    } catch (err) {
      res.status(500).send("Server error");
    }
  });
});

// Endpoint to get all uploaded documents
app.get("/documents", async (req, res) => {
  try {
    const documents = await DocumentUpload.find();
    res.json(documents);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Routes
app.use("/api/auth", auth);
app.use("/api/customers", customer);
app.use("/api/transactions", transaction);
app.use("/api/accounts", account);
app.use("/api/emailOtp", emailOtp);
app.use("/api", download);
app.use("/api/uploads", uploadRoutes);

app.get("/", (req, res) => {
  res.send("Server is working!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
