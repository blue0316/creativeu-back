const AWS = require("aws-sdk");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "us-east-2",
  credentials: new AWS.EnvironmentCredentials("AWS"),
});

const deleteFile = (key) => {
  return new Promise(async (resolve, reject) => {
    // Set the parameters
    const bucketParams = {
      Bucket:
        process.env.NODE_ENV === "development"
          ? "creativeu-test-bucket"
          : "creativeu-production-bucket",
      // Add the required 'Key' parameter using the 'path' module.
      Key: key,
    };
    try {
      const data = await client.send(new DeleteObjectCommand(bucketParams));
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

exports.deleteFile = deleteFile;
