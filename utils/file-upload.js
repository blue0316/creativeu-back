const AWS = require("aws-sdk");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const uploadFile = (key, file) => {
  const client = new S3Client({
    region: "us-east-2",
    // credentials: new AWS.SharedIniFileCredentials({ profile: "work-account" }),
    credentials: new AWS.EnvironmentCredentials("AWS"),
  });

  console.log(client);

  return new Promise(async (resolve, reject) => {
    //Set the parameters
    const uploadParams = {
      Bucket:
        process.env.NODE_ENV === "development"
          ? "creativeu-test-bucket"
          : "creativeu-production-bucket",
      // Add the required 'Key' parameter using the 'path' module.
      Key: key,
      // Add the required 'Body' parameter
      Body: file,
      ACL: "public-read",
    };

    //Upload file to specified bucket.
    try {
      const data = await client.send(new PutObjectCommand(uploadParams));
      const url =
        process.env.NODE_ENV === "development"
          ? `https://creativeu-test-bucket.s3.us-east-2.amazonaws.com/${key}`
          : `https://creativeu-production-bucket.s3.us-east-2.amazonaws.com/${key}`;
      resolve(url);
    } catch (err) {
      console.log("ERROR UPLOADING FILE");
      console.log(err);
      reject(err);
    }
  });
};

exports.uploadFile = uploadFile;
