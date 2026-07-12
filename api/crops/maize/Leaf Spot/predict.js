const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs-node");

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

let model = null;
let labels = null;

async function loadModel() {
  if (model) return;

  console.log("Loading Maize Leaf Spot model...");

  const modelPath = path.join(
    process.cwd(),
    "models",
    "crops",
    "maize",
    "Leaf_spot",
    "model.json"
  );

  model = await tf.loadLayersModel(
    `file://${modelPath}`
  );

  console.log("Model loaded");

  const metadataPath = path.join(
    process.cwd(),
    "models",
    "crops",
    "maize",
    "Leaf_spot",
    "metadata.json"
  );

  const metadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf8")
  );

  labels = metadata.labels;

  console.log(
    `Loaded ${labels.length} labels`
  );
}

module.exports = async function handler(req, res) {
  try {
    await loadModel();

    const form = new formidable.IncomingForm({
      multiples: false,
    });

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        const uploadedFile = Array.isArray(files.image)
          ? files.image[0]
          : files.image;

        if (!uploadedFile) {
          return res.status(400).json({
            success: false,
            error: "No image uploaded",
          });
        }

        const imageBuffer = fs.readFileSync(
          uploadedFile.filepath
        );

        const resized = await sharp(imageBuffer)
          .resize(224, 224)
          .removeAlpha()
          .raw()
          .toBuffer();

        let tensor = tf.tensor3d(
          new Uint8Array(resized),
          [224, 224, 3]
        );

        tensor = tensor
          .toFloat()
          .div(127.5)
          .sub(1)
          .expandDims(0);

        const prediction = model.predict(tensor);

        const scores = await prediction.data();

        let bestIndex = 0;

        for (let i = 1; i < scores.length; i++) {
          if (scores[i] > scores[bestIndex]) {
            bestIndex = i;
          }
        }

        tf.dispose([
          tensor,
          prediction
        ]);

        return res.status(200).json({
          success: true,
          crop: "Maize",
          disease: "Leaf Spot",
          scientificName: "Various fungal pathogens",
          prediction: labels[bestIndex],
          confidence: Number(
            (
              scores[bestIndex] * 100
            ).toFixed(2)
          ),
        });

      } catch (error) {
        console.error(error);

        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};