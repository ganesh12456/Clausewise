import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Clausewise | Contract intelligence',description:'A focused workspace for contract review, policy checks and obligations.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
