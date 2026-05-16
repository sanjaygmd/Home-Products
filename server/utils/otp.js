import crypto from "crypto";

export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOtp = (otp, salt = "") => {
  const pepper = process.env.MASTER_SECURITY_KEY;
  if (!pepper) {
    throw new Error("CRITICAL: MASTER_SECURITY_KEY environment variable is not set. OTP operations aborted for security.");
  }
  return crypto.createHash("sha256").update(otp + salt + pepper).digest("hex");
};