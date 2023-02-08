import AWS from "aws-sdk";
import { Downloading } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useEffect, useState } from "react";
const accessKeyId = "AKIAXK7SOWYGJXBES3CK";
const secretAccessKey = "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";
AWS.config.update({
  accessKeyId,
  secretAccessKey,
  region: "us-east-1",
});

const s3 = new AWS.S3();

function ImageView({ uuid }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!uuid) {
      return;
    }
    const params = {
      Bucket: "smrtimages",
      Key: uuid,
    };

    setTimeout(() => {
      s3.getObject(params, function (err, data) {
        if (err) {
          console.error(err);
        } else {
          const imageUrl = URL.createObjectURL(new Blob([data.Body]));
          setImageUrl(imageUrl);
        }
      });
    }, 300);
  }, [uuid]);

  return (
    <div>
      {imageUrl ? (
        // set max size of image
        <img src={imageUrl} alt="" style={{"maxWidth": "500px"}} />
      ) : (
        <>
          <Typography>Loading...</Typography>
          <Downloading />
        </>
      )}
    </div>
  );
}

export default ImageView;




