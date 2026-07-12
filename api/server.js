const express = require("express");
const multer = require("multer");
const cors = require("cors");
const tf = require("@tensorflow/tfjs");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());

const upload = multer({
  dest: "uploads/",
});

let model;
let labels = [];

async function loadModel() {
  const modelPath =
    "file://" +
    path.resolve(
      __dirname,
      "../models/pests/model.json"
    );

  model = await tf.loadLayersModel(modelPath);

  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../models/pests/metadata.json"
      ),
      "utf8"
    )
  );

  labels = metadata.labels;

  console.log("Model Loaded");
  console.log("Classes:", labels.length);
}

loadModel();

app.post(
  "/predict",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image uploaded",
        });
      }

      const imageBuffer = await sharp(
        req.file.path
      )
        .resize(224, 224)
        .removeAlpha()
        .raw()
        .toBuffer();

      const tensor = tf.tensor3d(
        new Uint8Array(imageBuffer),
        [224, 224, 3]
      );

      const normalized = tensor
        .toFloat()
        .div(127.5)
        .sub(1);

      const batched =
        normalized.expandDims(0);

      const prediction =
        model.predict(batched);

      const scores =
        await prediction.data();

      const results = labels.map(
        (label, index) => ({
          className: label,
          probability: scores[index],
        })
      );

      results.sort(
        (a, b) =>
          b.probability -
          a.probability
      );

      res.json({
        prediction:
          results[0].className,
        confidence: Number(
          (
            results[0].probability *
            100
          ).toFixed(2)
        ),
        all_predictions:
          results,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

app.listen(3000, () => {
  console.log(
    "Server running on port 3000"
  );
});