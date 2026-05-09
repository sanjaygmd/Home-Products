import crypto from "crypto";

export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOtp = (otp, salt = "") => {
  const pepper = process.env.MASTER_SECURITY_KEY || "default_gmd_pepper";
  return crypto.createHash("sha256").update(otp + salt + pepper).digest("hex");
};