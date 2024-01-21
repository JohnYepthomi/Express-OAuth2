require("dotenv").config();

const { OAuth2Client } = require("google-auth-library");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const port = 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",   // REQUIRED FOR SPREADHEETS
  "https://www.googleapis.com/auth/userinfo.email",  // REQURIED TO DIFFERENTIATE USER BY EMAIL
  "https://www.googleapis.com/auth/drive.file"  // REQUIRED FOR DRIVE PICKER
];

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.use(bodyParser.json());

app.get("/authorize", (req, res) => {
  try {
    const clientId = req.query.clientId;

    if (!clientId) {
      throw new Error("Missing client ID");
    }

    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state: clientId,
    });

    res.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error in /authorize:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// app.get("/", (req, res) => {
//   try {
//     console.log(req.query);

//     const code = req.query.code;
//     const clientId = req.query.state;

//     if (!code || !clientId) {
//       throw new Error("Authorization Code or clientId Missing");
//     }

//     oAuth2Client.getToken(code, (err, token) => {
//       if (err) {
//         console.error("Error exchanging code for tokens:", err);
//         res.status(500).send("Internal Server Error");
//       } else {
//         try {
//           const id_token = token.id_token;
//           const decoded = jwt.decode(id_token, { complete: true });
//           const refreshToken = token.refresh_token;
//           const google_email = decoded.payload.email;

//           if (!refreshToken || !google_email) {
//             throw new Error("Invalid token data or user email missing");
//           }

//           const newUserToken = { email: google_email, refreshToken };
//           saveRefreshToken(clientId, newUserToken);

//           res.json({ accessToken: token.access_token, refreshToken });
//         } catch (err) {
//           console.error("Error decoding ID token:", err);

//           if (err instanceof jwt.JsonWebTokenError) {
//             return res.status(400).json({ error: "Invalid ID token" });
//           } else {
//             return res.status(500).send("Internal Server Error");
//           }
//         }
//       }
//     });
//   } catch (error) {
//     console.error("Error in /:", error.message);
//     res.status(500).send("Internal Server Error");
//   }
// });

app.get("/", (req, res) => {
  try {
    console.log(req.query);

    const code = req.query.code;
    const clientId = req.query.state;

    if (!code || !clientId) {
      throw new Error("Authorization Code or clientId Missing");
    }

    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error("Error exchanging code for tokens:", err);
        res.status(500).send("Internal Server Error");
      } else {
        try {
          const id_token = token.id_token;
          const decoded = jwt.decode(id_token, { complete: true });
          const refreshToken = token.refresh_token;
          const google_email = decoded.payload.email;

          if (!refreshToken || !google_email) {
            throw new Error("Invalid token data or user email missing");
          }

          const newUserToken = { email: google_email, refreshToken };
          saveRefreshToken(clientId, newUserToken);

          const htmlResponse = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Authorization Success</title>
            </head>
            <body>
              <h1>Authorization Successful!</h1>

              <div style="display: flex; align-items: center; gap: 5px;">
                <div>Email: </div>
                <p id="email">${google_email} </p>
              </div>

              <div style="display: flex; align-items: center; gap: 5px;">
                <div>Access Token: </div>
                <p id="token">${token.access_token}</p>
              </div>
            </body>
            </html>
          `;

          res.send(htmlResponse);
        } catch (err) {
          console.error("Error decoding ID token:", err);

          if (err instanceof jwt.JsonWebTokenError) {
            return res.status(400).json({ error: "Invalid ID token" });
          } else {
            return res.status(500).send("Internal Server Error");
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in /:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/upload", (req, res) => {
  
});

app.post("/refreshToken", (req, res) => {
  const clientIdFromRequest = req.body.clientId;
  const storedRefreshToken = getStoredRefreshToken(clientIdFromRequest);

  if (!clientIdFromRequest || !storedRefreshToken) {
    return res
      .status(400)
      .json({ error: "Invalid client ID or no stored refresh token" });
  }

  oAuth2Client.setCredentials({ refresh_token: storedRefreshToken });

  oAuth2Client
    .getAccessToken()
    .then((tokenResponse) => {
      const accessToken = tokenResponse.token;
      res.json({ accessToken });
    })
    .catch((err) => {
      console.error("Error refreshing token:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });
});

function getStoredRefreshToken(clientId) {
  try {
    const filePath = `./refreshTokens/${clientId}.json`;
    const data = fs.readFileSync(filePath, "utf-8");
    const storedData = JSON.parse(data);
    return storedData.refreshToken;
  } catch (err) {
    console.error("Error reading refresh token:", err);
    return null;
  }
}

function saveRefreshToken(clientId, userToken) {
  try {
    if (!fs.existsSync("./refreshTokens")) {
      fs.mkdirSync("./refreshTokens");
    }

    const filePath = `./refreshTokens/${clientId}.json`;
    const data = JSON.stringify({ userToken });
    fs.writeFileSync(filePath, data, "utf-8");
  } catch (err) {
    console.error("Error saving refresh token:", err);
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

/*------------------------------------------------------
sheet_Id: 1lkQxTbtOCwOjEwoS02Kx-ftkyQBHGfhhWza9hCA2Zm8
------------------------------------------------------*/
