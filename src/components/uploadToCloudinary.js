import axios from "axios";

const uploadToCloudinary = async (file) => {
  const preset = "agrisync_upload"; // your unsigned preset name
  const cloudName = "dyweczdw2"; // 🔁 Replace with your actual cloud name

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  try {
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
      formData
    );
    return res.data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw error;
  }
};

export default uploadToCloudinary;
