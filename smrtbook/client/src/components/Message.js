import { Box, Stack, Avatar, Typography } from "@mui/material";
import { AccessTime } from "@mui/icons-material";
import ImageView from "./ImageView.js";

function Message({ message, user }) {
  return (
    <Box
      sx={{
        alignSelf: message.sender === user ? "flex-end" : "flex-start",
        backgroundColor: message.sender === user ? "#35baf6" : "#b0bec5",
        padding: ".3rem",
        marginRight: "1rem",
        borderRadius: "16px",
      }}
    >
      <Stack direction="row" sx={{ ml: "1.2rem" }}>
        <Avatar sx={{ bgcolor: "#001234" }} children={message.sender[0]} />
        <Box sx={{ width: "1rem" }} />
        <Stack direction="column">
          <Typography
            variant="body1"
            sx={{
              fontWeight: "bold",
              marginBottom: 0,
            }}
          >
            {message.sender}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "grey",
            }}
          >
            <AccessTime sx={{ fontSize: "1rem" }} />
            {
              // checking if date is today to see if we should display time or date and time
              new Date(parseInt(message.timestamp)).toLocaleDateString() ===
              new Date().toLocaleDateString()
                ? new Date(parseInt(message.timestamp)).toLocaleString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }
                  )
                : new Date(parseInt(message.timestamp)).toLocaleString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    }
                  )
            }
          </Typography>
        </Stack>
        {message.isImage ? (
          <ImageView uuid={message.text} />
        ) : (
          <Typography variant="body2" sx={{ width: "20rem" }}>
            {message.text}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default Message;
