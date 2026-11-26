const API_URL =
  `/api/auth`;


// ==========================================
// REGISTER
// ==========================================

export const register = async (userData) => {
  const response = await fetch(
    `${API_URL}/register`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify(userData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Registration failed"
    );
  }

  return data;
};


// ==========================================
// LOGIN
// ==========================================

export const login = async (userData) => {
  const response = await fetch(
    `${API_URL}/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify(userData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Login failed"
    );
  }

  return data;
};


// ==========================================
// CURRENT USER
// ==========================================

export const getCurrentUser = async () => {
  try {
    const response = await fetch(
      `${API_URL}/me`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.user;
  } catch (error) {
    console.error(
      "Could not check current user:",
      error
    );

    return null;
  }
};


// ==========================================
// LOGOUT
// ==========================================

export const logout = async () => {
  const response = await fetch(
    `${API_URL}/logout`,
    {
      method: "POST",

      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Logout failed"
    );
  }

  return data;
};


// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (email) => {
  const response = await fetch(
    `${API_URL}/forgot-password`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not send password reset email"
    );
  }

  return data;
};


// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (
  token,
  password
) => {
  const response = await fetch(
    `${API_URL}/reset-password/${token}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Password reset failed"
    );
  }

  return data;
};


// ==========================================
// SEND EMAIL OTP
// ==========================================

export const sendEmailOtp = async (email) => {
  const response = await fetch(
    `${API_URL}/send-otp`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not send OTP"
    );
  }

  return data;
};


// ==========================================
// VERIFY EMAIL OTP
// ==========================================

export const verifyEmailOtp = async (
  email,
  otp
) => {
  const response = await fetch(
    `${API_URL}/verify-otp`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "OTP verification failed"
    );
  }

  return data;
};
