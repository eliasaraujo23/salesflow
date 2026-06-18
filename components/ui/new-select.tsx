// "use client"

// import { cn } from "@/lib/utils";
// import { Check, ChevronDown } from 'lucide-react';
// import React, { useEffect, useRef, useState } from "react";

// const Select = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
//   ({ className, children, ...props }, ref) => (
//     <div ref={ref} className={cn("relative inline-block w-full", className)} {...props}>
//       {children}
//     </div>
//   )
// );
// Select.displayName = "Select";

// const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
//   ({ className, children, ...props }, ref) => {
//     const [open, setOpen] = useState(false);
//     const triggerRef = useRef<HTMLButtonElement>(null);
//     const contentRef = useRef<HTMLDivElement>(null);

//     const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
//       e.preventDefault();
//       setOpen(prev => !prev);
//     };

//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
//         contentRef.current && !contentRef.current.contains(event.target as Node)
//       ) {
//         setOpen(false);
//       }
//     };

//     useEffect(() => {
//       document.addEventListener('mousedown', handleClickOutside);
//       return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);

//     return (
//       <div className="relative">
//         <button
//           ref={triggerRef}
//           onClick={handleClick}
//           className={cn(
//             "flex items-center justify-between w-full h-8 px-3 py-2 text-xs bg-accent border border-accent rounded-sm text-muted-foreground shadow-inner focus:outline-none",
//             className
//           )}
//           type="button" // Define o tipo como button para evitar o envio do formulário
//           {...props}
//         >
//           {children}
//           <ChevronDown className="w-4 h-4 ml-2" />
//         </button>
//         {open && (
//           <SelectContent ref={contentRef} onClick={() => setOpen(false)}>
//             //@ts-ignore
//             {props.children}
//           </SelectContent>
//         )}
//       </div>
//     );
//   }
// );
// SelectTrigger.displayName = "SelectTrigger";

// const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
//   ({ className, children, ...props }, ref) => (
//     <div
//       ref={ref}
//       className={cn(
//         "absolute z-10 mt-1 w-full bg-input border border-gray-300 rounded-md max-h-60 overflow-auto scrollbar-hidden shadow-lg",
//         className
//       )}
//       {...props}
//     >
//       <div className="overflow-auto max-h-full">
//         {children}
//       </div>
//     </div>
//   )
// );
// SelectContent.displayName = "SelectContent";

// const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
//   ({ className, children, ...props }, ref) => (
//     <div
//       ref={ref}
//       className={cn(
//         "cursor-pointer p-2 text-sm hover:bg-gray-100 bg-white",
//         className
//       )}
//       {...props}
//     >
//       {children}
//     </div>
//   )
// );
// SelectItem.displayName = "SelectItem";

// const SelectItemIndicator = ({ className }: { className?: string }) => (
//   <div className={cn("absolute right-2 top-1/2 transform -translate-y-1/2", className)}>
//     <Check className="w-4 h-4" />
//   </div>
// );

// export { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger };

