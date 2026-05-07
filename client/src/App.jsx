import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from "./pages/HomePage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import KitchenProductsPage from './pages/KitchenProductsPage.jsx';
import LivingRoomProductPage from './pages/LivingRoomProductPage.jsx';
import BedRoomProductsPage from './pages/BedRoomProductsPage.jsx';
import CategoryProductsPage from './pages/CategoryProductsPage.jsx';
import CartPage from './pages/CartPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import PolicyPage from './pages/PolicyPage.jsx';

import { CartProvider } from './context/CartContext/CartProvider.jsx'
import WishListPage from './pages/WishListPage.jsx';
import { WishListProvider } from './context/WishListContext/WishListProvider.jsx';
import SellerPortalPage from './pages/SellerPortalPage.jsx';
import SellerLoginPage from './components/SellerDashboard/SellerLoginPage.jsx';
import SellerRegistration from './components/SellerDashboard/SellerRegistration.jsx';
import SellerOverview from './components/SellerDashboard/SellerOverview.jsx';
import SellerProducts from './components/SellerDashboard/SellerProducts.jsx';
import SellerOrders from './components/SellerDashboard/SellerOrders.jsx';
import SellerCustomers from './components/SellerDashboard/SellerCustomers.jsx';
import SellerSettings from './components/SellerDashboard/SellerSettings.jsx';
import SellerAnalytics from './components/SellerDashboard/SellerAnalytics.jsx';
import SellerPayments from './components/SellerDashboard/SellerPayments.jsx';
import SellerMessages from './components/SellerDashboard/SellerMessages.jsx';
import SellerPickups from './components/SellerDashboard/SellerPickups.jsx';
import SellerReturns from './components/SellerDashboard/SellerReturns.jsx';

import AddProduct from './components/SellerDashboard/AddProduct.jsx';
import EditProduct from './components/SellerDashboard/EditProduct.jsx';
import DeleteProduct from './components/SellerDashboard/DeleteProduct.jsx';
import CheckoutSinglePage from './pages/CheckoutSinglePage.jsx';
import OrderPlaced from './components/CheckoutPage/OrderPlaced.jsx';
import Onboarding from './components/SellerDashboard/SellerOnboarding/Onboarding.jsx';
import { ProductProvider } from './context/ProductContext/ProductProvider.jsx';
import { OnboardingProvider } from './context/OnboardingContext/OnboardingProvider.jsx';
import ProfilePage from './components/ProfilePage/ProfilePage.jsx';
import CustomerLogin from './components/CustomerLogin/CustomerLogin.jsx';
import CustomerRegister from './components/CustomerLogin/CustomerRegister.jsx';
import CustomerOnboarding from './components/CustomerLogin/CustomerOnboarding.jsx';
import { SellerProtectedRoute, CustomerProtectedRoute, PublicRoute, AdminProtectedRoute } from './components/ProtectedRoute.jsx';

// Admin Imports
import { DashboardLayout } from './components/admin/components/DashboardLayout.jsx';
import AdminAuthPage from './components/admin/pages/AdminAuthPage.jsx';
import DashboardHome from './components/admin/pages/DashboardHome.jsx';
import ProductsPage from './components/admin/pages/ProductsPage.jsx';
import OrdersPage from './components/admin/pages/OrdersPage.jsx';
import CustomersPage from './components/admin/pages/CustomersPage.jsx';
import FinancePage from './components/admin/pages/FinancePage.jsx';
import AnalyticsPage from './components/admin/pages/AnalyticsPage.jsx';
import PaymentsPage from './components/admin/pages/PaymentsPage.jsx';
import ReturnsPage from './components/admin/pages/ReturnsPage.jsx';
import AdminProfilePage from './components/admin/pages/ProfilePage.jsx';
import SupportPage from './components/admin/pages/SupportPage.jsx';
import SettingsPage from './components/admin/pages/SettingsPage.jsx';
import AddProductPage from './components/admin/pages/AddProductPage.jsx';
import SellersPage from './components/admin/pages/SellersPage.jsx';
import CouponsPage from './components/admin/pages/CouponsPage.jsx';
import SystemLogsPage from './components/admin/pages/SystemLogsPage.jsx';
import ReviewsPage from './components/admin/pages/ReviewsPage.jsx';
import PrimaryVendorPage from './components/admin/pages/PrimaryVendorPage.jsx';
import AdministratorsPage from './components/admin/pages/AdministratorsPage.jsx';
import { AdminSearchProvider } from './components/admin/contexts/AdminSearchContext';

import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

function App() {

  return (
    <div
      className="bg-gray-50">
      <MainApp />
    </div>
  )
}

function MainApp() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <OnboardingProvider>
            <ProductProvider>
              <CartProvider>
                <WishListProvider>
                  <Routes>
                    <Route path='/' element={<HomePage />} />
                    <Route path='/cart' element={<CartPage />} />
                    <Route path='/product/:slug' element={<ProductPage />} />
                    <Route path='/kitchen-products' element={<KitchenProductsPage />} />
                    <Route path='/livingRoom-products' element={<LivingRoomProductPage />} />
                    <Route path='/bedRoom-products' element={<BedRoomProductsPage />} />
                    <Route path='/category/:room' element={<CategoryProductsPage />} />
                    <Route path='/wishlist' element={<WishListPage />} />
                    <Route path='/profile' element={
                      <CustomerProtectedRoute>
                        <ProfilePage />
                      </CustomerProtectedRoute>
                    } />
                    <Route path='/search' element={<SearchPage />} />
                    <Route path='/terms' element={<PolicyPage type="terms" />} />
                    <Route path='/privacy' element={<PolicyPage type="privacy" />} />

                    <Route path='/checkout' element={
                      <CustomerProtectedRoute>
                        <CheckoutSinglePage />
                      </CustomerProtectedRoute>
                    } />
                    <Route path='/order-success' element={<OrderPlaced />} />

                    <Route path='/seller/login' element={
                      <PublicRoute restrictedTo="seller">
                        <SellerLoginPage />
                      </PublicRoute>
                    } />
                    <Route path='/seller/register' element={
                      <PublicRoute restrictedTo="seller">
                        <SellerRegistration />
                      </PublicRoute>
                    } />
                    <Route path='/seller/onboarding' element={
                      <SellerProtectedRoute>
                        <Onboarding />
                      </SellerProtectedRoute>
                    } />

                    <Route path='/customer-login' element={
                      <PublicRoute restrictedTo="customer">
                        <CustomerLogin />
                      </PublicRoute>
                    } />
                    <Route path='/customer-register' element={
                      <PublicRoute restrictedTo="customer">
                        <CustomerRegister />
                      </PublicRoute>
                    } />
                    <Route path='/customer-onboarding' element={
                      <CustomerProtectedRoute>
                        <CustomerOnboarding />
                      </CustomerProtectedRoute>
                    } />



                    <Route path='/seller' element={
                      <SellerProtectedRoute requireVerified={true}>
                        <SellerPortalPage />
                      </SellerProtectedRoute>
                    }>
                      <Route index element={<SellerOverview />} />
                      <Route path='products' element={<SellerProducts />} />
                      <Route path='orders' element={<SellerOrders />} />
                      <Route path='customers' element={<SellerCustomers />} />
                      <Route path='analytics' element={<SellerAnalytics />} />
                      <Route path='payments' element={<SellerPayments />} />
                      {/* <Route path='messages' element={<SellerMessages />}/> */}
                      <Route path='pickups' element={<SellerPickups />} />
                      <Route path='returns' element={<SellerReturns />} />
                      <Route path='settings' element={<SellerSettings />} />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminAuthPage />} />
                    <Route path="/admin/signup" element={<AdminAuthPage />} />
                    <Route path="/admin" element={
                      <AdminProtectedRoute>
                        <AdminSearchProvider>
                          <DashboardLayout />
                        </AdminSearchProvider>
                      </AdminProtectedRoute>
                    }>
                      <Route index element={<DashboardHome />} />
                      <Route path="products" element={<ProductsPage />} />
                      <Route path="products/add" element={<AddProductPage />} />
                      <Route path="products/edit/:id" element={<AddProductPage />} />
                      <Route path="orders" element={<OrdersPage />} />
                      <Route path="customers" element={<CustomersPage />} />
                      <Route path="finance" element={<FinancePage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="payments" element={<PaymentsPage />} />
                      <Route path="returns" element={<ReturnsPage />} />
                      <Route path="profile" element={<AdminProfilePage />} />
                      <Route path="support" element={<SupportPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="sellers" element={<SellersPage />} />
                      <Route path="coupons" element={<CouponsPage />} />
                      <Route path="logs" element={<SystemLogsPage />} />
                      <Route path="reviews" element={<ReviewsPage />} />
                      <Route path="primary-vendor" element={<PrimaryVendorPage />} />
                      <Route path="administrators" element={<AdministratorsPage />} />
                    </Route>
                  </Routes>
                </WishListProvider>
              </CartProvider>
            </ProductProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
