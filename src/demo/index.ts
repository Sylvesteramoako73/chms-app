const KEY = 'chms_demo_mode';

export const isDemoMode = () => sessionStorage.getItem(KEY) === 'true';
export const enterDemo  = () => sessionStorage.setItem(KEY, 'true');
export const exitDemo   = () => sessionStorage.removeItem(KEY);
