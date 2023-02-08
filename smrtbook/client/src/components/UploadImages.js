import React, { useState } from "react";
import { Button, TextField, Stack } from "@mui/material";
import Send from "@mui/icons-material/Send";
import { v4 as uuidv4 } from "uuid";
const AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-1" });
const accessKeyId = "AKIAXK7SOWYGJXBES3CK";
const secretAccessKey = "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";
AWS.config.update({
  accessKeyId,
  secretAccessKey,
});

const s3 = new AWS.S3();

function UploadImages({chatName, sender, socket}) {
    const [image, setImage] = useState(null);
    const handleUpload = () => {
      const uuid = uuidv4();
      const params = {
        Bucket: "smrtimages",
        Key: uuid,
        Body: image,
      };

      s3.putObject(params, function (err, data) {
        if (err) {
          console.error(err);
        } else {
          console.log("Success!");
        }
      });

      socket.emit("message", {
        sender: sender,
        text: uuid,
        isImage: true,
        timestamp: new Date().getTime(),
        chatName: chatName,
      });
    };
    
    const handleChange = (e) => {
        setImage(e.target.files[0]);
    };

    return (
      <div>
        <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
          <TextField type="file" onChange={handleChange} />
          <Button
            variant="contained"
            type="submit"
            endIcon={<Send />}
            onClick={handleUpload}
            sx={{ width: "38%" }}
          >
            Send (Image)
          </Button>
        </Stack>
      </div>
    );
}

export default UploadImages;
