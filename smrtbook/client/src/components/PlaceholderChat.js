import { Box, Typography } from "@mui/material";

function PlaceholderChat() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h5">Choose a group chat!</Typography>
    </Box>
  );
}

export default PlaceholderChat;
