import { Button } from "antd";

export const PageBtn = ({ children, variant, onClick, disabled, loading, customClass, icon }) => {
    if (!variant) variant = 'silent';
    let variantClasses = '';
    switch (variant)
    {
        case 'silent':
            variantClasses = 'border-neutral-500 bg-neutral-100 hover:bg-neutral-200 text-black';
            break;
        case 'blue':
            variantClasses = 'border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700';
            break;
        case 'green':
            variantClasses = 'border-green-600 bg-green-50 hover:bg-green-100 text-green-700';
            break;
        case 'amber':
            variantClasses = 'border-amber-600 bg-amber-50 hover:bg-amber-100 text-amber-700';
            break;
        case 'red':
            variantClasses = 'border-red-600 bg-red-50 hover:bg-red-100 text-red-700';
            break;
    }
    return (
        <Button {...{ disabled, loading, onClick, icon }} className={`
            ${customClass}
            ${variantClasses}
            text-sm px-4 py-1 border rounded-lg disabled:opacity-50 disabled:brightness-[0.93]
        `}>
            {children}
        </Button>
    )
}