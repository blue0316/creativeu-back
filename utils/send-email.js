// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");

const SES_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_01, //add AWS IAM user access key here
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_01, //add AWS IAM user secret key here
  region: "us-east-2",
};

const AWS_SES = new AWS.SES(SES_CONFIG);

const SOURCE =
  process.env.NODE_ENV === "development"
    ? "joe@webifyplatform.com"
    : "noreply@creativeu.live";
const INFO =
  process.env.NODE_ENV === "development"
    ? ["joe@webifyplatform.com"]
    : ["info@creativeu.live"];
const ADMINS =
  process.env.NODE_ENV === "development"
    ? ["joe@webifyplatform.com"]
    : ["admin@creativeu.live", "shane@creativeu.live", "linda@creativeu.live"];
const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://creativeu.live";

const sendAccountExecutiveCode = (email, link) => {
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data:
              //
              `Dear Future Account Executive,
  
Please use the following link to register so we can confirm your status as an account executive.
  
${link}
  
This link will expire in one week.

Welcome aboard!

Sincerely,

The CreativeU Team
`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "CreativeU Account Executive Registration",
        },
      },
      Source: SOURCE,
    };

    //Create the promise and SES service object
    var sendPromise = AWS_SES.sendEmail(params).promise();

    sendPromise
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

const sendPasswordResetEmail = (email, code) => {
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data:
              //
              `Dear CreativeU User,
  
Someone has requested a new password for your account. If this was NOT you, simply ignore this email - no action is required.

If you requested a new password, please follow the link below to reset it. The link will expire in 24 hours. Thank you!

Sincerely,

the CreativeU Support Team
  
${BASE_URL + "/reset-password?resetcode=" + code}
`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Reset CreativeU Password",
        },
      },
      Source: SOURCE,
    };

    //Create the promise and SES service object
    var sendPromise = AWS_SES.sendEmail(params).promise();

    sendPromise
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

const sendJoinCode = (email, fname, link) => {
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data:
              //
              `Dear ${fname},
  
Please use the link below to register for your free CreativeU lifetime membership.
  
${link}
  
This link will expire in one week.

Welcome aboard!

Sincerely,

The CreativeU Team
`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "CreativeU Account Executive Registration",
        },
      },
      Source: SOURCE,
    };

    //Create the promise and SES service object
    var sendPromise = AWS_SES.sendEmail(params).promise();

    sendPromise
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

const sendContactUsEmail = (name, email, message) => {
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        ToAddresses: INFO,
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `You have a new inquiry:

FROM: ${name}
EMAIL: ${email}
MESSAGE:
${message}
`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "New Contact Us Form Submission",
        },
      },
      Source: SOURCE,
    };
    //Create the promise and SES service object
    var sendPromise = AWS_SES.sendEmail(params).promise();

    sendPromise
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

const sendNewArtistPackUserEmail = ({
  fname,
  lname,
  city,
  stateOrProvince,
  country,
  postalCode,
  email,
  cell,
  displayName,
  profileUrl,
}) => {
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        ToAddresses: ADMINS,
      },
      Message: {
        Body: {
          Text: {
            Charset: "UTF-8",
            Data: `Dear CreativeU Administrative User,

A user has recently signed up for an Artist Pack membership. Please contact them to set up a recording session.

DETAILS

NAME: ${fname} ${lname} 
LOCATION: ${city}, ${stateOrProvince}, ${country} ${postalCode}
EMAIL: ${email}
CELL: ${cell}
USERNAME: ${displayName}
CURRENT PROFILE LINK: ${BASE_URL + "/user?user=" + profileUrl}
`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "ACTION REQUIRED: New Artist Pack Membership",
        },
      },
      Source: SOURCE,
    };
    //Create the promise and SES service object
    var sendPromise = AWS_SES.sendEmail(params).promise();

    sendPromise
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
};

exports.sendNewArtistPackUserEmail = sendNewArtistPackUserEmail;
exports.sendContactUsEmail = sendContactUsEmail;
exports.sendJoinCode = sendJoinCode;
exports.sendAccountExecutiveCode = sendAccountExecutiveCode;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
