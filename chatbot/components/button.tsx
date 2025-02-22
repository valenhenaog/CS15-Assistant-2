import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button {...props} className={`px-4 py-2 rounded bg-blue-600 text-white ${props.className}`}>
      {children}
    </button>
  );
};