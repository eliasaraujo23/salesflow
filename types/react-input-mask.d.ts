declare module 'react-input-mask' {
  import React from 'react';

  interface InputMaskProps {
    mask?: string;
    maskChar?: string;
    alwaysShowMask?: boolean;
    value?: string | number;
    onChange?: (e: any) => void;
    children?: (props: any) => React.ReactNode;
  }

  const InputMask: React.ComponentType<InputMaskProps & React.HTMLAttributes<HTMLInputElement>>;
  export default InputMask;
}
