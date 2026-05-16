import { api } from "./api.js";


export const sendOtp = (data) =>
  api.post(`/user/customer/send-otp`, data).then((res) => res.data);

export const verifyOtp = (data) =>
  api.post(`/user/customer/verify-otp`, data).then((res) => res.data);

export const sendSellerOtp = (data) =>
  api.post(`/user/seller/send-otp`, { ...data, user_type: 'seller' }).then((res) => res.data);

export const verifySellerOtp = (data) =>
  api.post(`/user/seller/verify-otp`, { ...data, user_type: 'seller' }).then((res) => res.data);

export const customerRegister = async (registerData) => {
    try {
        const res = await api.post('/user/customer/register', registerData);
        return res.data        
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}

export const customerLogin = async (loginData) => {
    try {
        const res = await api.post('/user/customer/login', loginData);
        return res.data
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}

export const customerOnboarding = async (id, onBoardingData) => {
    try {
        const res = await api.post(`/user/customer-onboarding/${id}`, onBoardingData);
        return res.data
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}

export const sellerRegister = async (registerData) => {
    try {
        const res = await api.post(`/user/seller/register`, registerData);
        return res.data
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}

export const loginSeller = async (loginData) => {
    try {
        const res = await api.post('/user/seller/login', loginData);
        return res.data
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}

export const sellerOnboarding = async (id, onBoardingData) => {
    try {
        const res = await api.post(`/user/seller-onboarding/${id}`, onBoardingData);
        return res.data
    } catch (error) {
        return {success: false, message: error?.response?.data?.message || error.message}
    }
}


export const getCustomerById = async (id) => {
  try {
    const res = await api.get(`/user/customer/${id}`);
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

export const getCustomerStats = async (id) => {
  try {
    const res = await api.get(`/user/customer/stats/${id}`);
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

export const getCustomerOrders = async (id) => {
  try {
    const res = await api.get(`/user/customer/orders/${id}`);
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

export const updateCustomer = async (id, updateData) => {
  try {
    const res = await api.put(`/user/customer/update/${id}`, updateData);
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

export const getCustomerAddresses = async (id) => {
  try {
    const res = await api.get(`/user/customer/addresses/${id}`);
    return res.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || error.message,
    };
  }
};

export const logoutUser = async (userType) => {
    try {
        if (!userType) {
            // If userType is unknown, try to logout from all potential session endpoints
            // This handles cases where currentUser is null but tokens still exist
            const endpoints = ['/user/admin/logout', '/user/seller/logout', '/user/customer/logout'];
            let lastRes = { success: false };
            for (const ep of endpoints) {
                try {
                    const res = await api.post(ep);
                    if (res.data?.success) lastRes = res.data;
                } catch (e) { /* ignore individual endpoint failures */ }
            }
            return lastRes;
        }

        let endpoint = '/user/customer/logout';
        if (userType === 'seller') {
            endpoint = '/user/seller/logout';
        } else if (userType === 'admin' || userType === 'super_admin') {
            endpoint = '/user/admin/logout';
        }
        const res = await api.post(endpoint);
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};

// Admin Authentication Functions
export const adminLogin = async (loginData) => {
    try {
        const res = await api.post('/user/admin/login', loginData);
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};

export const adminRegister = async (registerData) => {
    try {
        const res = await api.post('/user/admin/register', registerData);
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};

export const verifySuperAdminLogin = async (data) => {
    try {
        const res = await api.post('/user/admin/verify-super-admin-login', data);
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};

export const requestAdminPasswordReset = async (email) => {
    try {
        const res = await api.post('/user/admin/request-password-reset', { email });
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};

export const verifyAdminPasswordReset = async (data) => {
    try {
        const res = await api.post('/user/admin/verify-password-reset', data);
        return res.data;
    } catch (error) {
        return { success: false, message: error?.response?.data?.message || error.message };
    }
};
