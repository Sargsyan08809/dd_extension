import React, { useEffect } from 'react';
import { BoltSlashIcon, BoltIcon, InformationCircleIcon} from '@heroicons/react/20/solid';
import {QuestionMarkCircleIcon} from '@heroicons/react/24/outline';
import axios from 'axios';
import { TabData } from './structs';

function Header(pageProps :TabData){

  const [serverLive, setServerLive] = React.useState<boolean>(false);

  useEffect(() => {
    async function livenessCheck() {
      const res = await axios.get(`${process.env.REACT_APP_SERVER_URL}/ping`);
      if (res.data === 'Server is running') {
        setServerLive(true);
      }
      console.log('livenesscheck', res.data);
    }
    livenessCheck();
  },[]);

  return(
    <div className="bg-slate-50 h-[60px] grid grid-cols-4 gap-8 rounded-sm">
      <div className="text-xs col-span-3 flex">

        <img src={pageProps.favIconUrl} className="h-6 w-6 ml-3 mt-1"/> 
        <span className="font-bold ml-1 mt-2 text-blue-500">{pageProps.url} </span>
      </div>

      <div className="flex justify-end">
        <div className="text-xs mr-1">
          {serverLive ? <BoltIcon className='text-green-400 mt-2.5 h-4 w-4'/> : <BoltSlashIcon className='text-red-700 font-bold mt-1 h-6 w-6'/>}
        </div>
        <QuestionMarkCircleIcon className="h-6 w-6 mt-1.5 mr-1 text-gray-800 hover:text-gray-400" aria-hidden="true" onClick={(e)=>{e.preventDefault();}} />
      </div>
    </div>
  );
}

export default Header;