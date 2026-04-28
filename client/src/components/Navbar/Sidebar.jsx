import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";

import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import FavoriteBorderSharpIcon from '@mui/icons-material/FavoriteBorderSharp';

import { animation, navMainIcon } from "../../utils/UIStyles";
import { sidebarOptions } from "../../data/SidebarData";
import { CartContext } from "../../context/CartContext/CartContext";
import { WishListContext } from "../../context/WishListContext/WishListContext";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const {cart} = useContext(CartContext);
  const {wishList} = useContext(WishListContext);

  const scrollToSection = (id) => {
    if(window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);

        if(element) {
          window.scrollTo({
            top: element.offsetTop - 35,
            behavior: 'smooth'
          })
        }
      }, 300) 
    } else {
      const element = document.getElementById(id);

      if(element) {
        window.scrollTo({
          top: element.offsetTop - 35,
          behavior: 'smooth'
        })
      }
    }

    setSidebarOpen(false)
  }

  return (
    <div
      className={`fixed top-20 left-0 w-full bg-white z-50 pb-5 ${animation}
    ${
      sidebarOpen
        ? "translate-y-0 opacity-100 pointer-events-auto md:hidden"
        : "-translate-y-full opacity-0 pointer-events-none md:hidden"
    }`}
    >
        <div className='flex flex-col sm:flex-row justify-center items-center pt-10 pb-4 gap-8 text-gray-800'>

        <div className='flex justify-center items-center sm:py-4 gap-0'>
        <input 
        className={`outline-0 text-gray-800 border border-gray-200 focus:border-blue-500 py-2 ps-4 px-5 rounded-full ${animation}`}
        type='text' 
        placeholder='Search...'/>
      </div>
      
      <div className="flex gap-9 text-gray-800">
        <button
          onClick={() => {
            if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
              navigate('/admin')
            } else {
              navigate('/profile')
            }
            setSidebarOpen(false)
          }}
          className={`hover:bg-blue-900 ${navMainIcon} ${animation}`}
        >
          <PermIdentityIcon />
        </button>

        <div className="relative">
        <button
          onClick={() => {
            navigate('/cart')
            setSidebarOpen(false)
          }}
          className={`hover:bg-blue-600 ${navMainIcon} ${animation}`}
        >
          <ShoppingCartOutlinedIcon />
        </button>
        {cart?.length > 0 &&
        <p className="px-1 text-sm absolute -top-1 -right-2 bg-blue-500 text-white rounded-full">{cart?.length || 0}</p>
        }
        </div>

        <div className="relative">
        <button
          onClick={() => { 
            navigate('/wishlist')
            setSidebarOpen(false)
          }}
          className={`hover:bg-pink-500 ${navMainIcon} ${animation}`}
        >
          <FavoriteBorderSharpIcon />
        </button>
        {wishList?.length > 0 &&
        <p className="px-1 text-sm absolute -top-1 -right-2 bg-pink-500 text-white rounded-full">{wishList?.length || 0}</p>
        }
        </div>
      </div>
      </div>

      <ul className="py-7 flex flex-col justify-center items-center gap-8 text-[1.1rem] text-gray-800">
        {
          sidebarOptions.map((option) => (
            <li 
            onClick={() => scrollToSection(option.toLowerCase())}
            key={option} 
            className={`hover:text-gray-500 cursor-pointer ${animation}`}>{option}</li>
          ))
        }
      </ul>

    </div>
  );
};

export default Sidebar;
