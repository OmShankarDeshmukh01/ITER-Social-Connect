const { doc, getDoc, updateDoc } = require("firebase/firestore");
const db = require("../firebase/firebaseConfig");
const { changePasswordSchema } = require("../validations/userValidations");
const bcrypt = require("bcrypt");

const isValidUrl = (url, platform) => {
  const regexes = {
    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/.*$/i,
    github: /^https?:\/\/(www\.)?github\.com\/.*$/i,
    x: /^https?:\/\/(www\.)?x\.com\/.*$/i,
  };
  return regexes[platform]?.test(url);
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Retrieve updated profile details from the request body
    const { name, about, github, linkedin, x } = req.body;

    // Check if any fields are provided for the update
    if (!name && !about && !github && !linkedin && !x) {
      return res
        .status(400)
        .json({ message: "At least one field must be provided to update" });
    }

    // Query Firestore to check if the user exists
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate social media links (if provided)
    if (linkedin && !isValidUrl(linkedin, "linkedin")) {
      return res.status(400).json({ message: "Invalid LinkedIn URL" });
    }
    if (github && !isValidUrl(github, "github")) {
      return res.status(400).json({ message: "Invalid GitHub URL" });
    }
    if (x && !isValidUrl(x, "x")) {
      return res.status(400).json({ message: "Invalid X URL" });
    }

    // Update user profile in Firestore
    const updateData = {
      ...(name && { name }),
      ...(about && { about }),
      ...(github && { github }),
      ...(linkedin && { linkedin }),
      ...(x && { x }),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated user data
    const updatedUserDoc = await getDoc(userRef);
    const updatedUserData = updatedUserDoc.data();

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUserData,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

const changePassword = async (req, res) => {
  try {
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res
        .status(400)
        .json({ message: validationResult.error.errors[0].message });
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const userId = req.user.userId;

    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      userDoc.data().password
    );
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }

    const newPasswordMatch = await bcrypt.compare(
      newPassword,
      userDoc.data().password
    );
    if (newPasswordMatch) {
      return res
        .status(400)
        .json({
          message: "New password cannot be the same as the current password",
        });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await updateDoc(userDocRef, { password: hashedPassword });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  updateProfile,
  changePassword,
};
