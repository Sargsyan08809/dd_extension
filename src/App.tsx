import React, { useEffect } from 'react';
import './index.css';
import {useState} from 'react';
import axios from 'axios';
import { SignalSlashIcon, CheckBadgeIcon, MagnifyingGlassIcon, ShieldExclamationIcon} from '@heroicons/react/20/solid';
import {ContractsPageProps,TabData, TokenListToken,ERC20sPageProps,AddressCollection} from './structs';
import NewPage from './Tokens';
import Header from './Header';
import Contracts from './Contracts';
import unverifiedPlaceholder from './unverifiedcontracts.json';
import blocksGif from './blocks.gif';
import { Circle } from 'rc-progress';
import {percentToColor} from './helpers';
import ERC20s from './Tokens';

function getAddresses() {
  const addressesFound: string[] = [];
  const scripts = document.getElementsByTagName('script');
  console.log('scripts', scripts);
  // remove if the script is from argent 
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].id.includes('argent-x-extension')) {
      continue;
    }
    fetch(scripts[i].src)
      .then((response) => response.text())
      .then((text) => {
        const regex = /0x[a-fA-F0-9]{40}/g;
        const found = text.match(regex);
        if (found) {
          found.forEach((address) => addressesFound.push(address));
        }
      }
      ).then(
        () => {
          const uniqueAddresses = new Set();
          addressesFound.forEach((address) => {
            uniqueAddresses.add(address);
          });
          uniqueAddresses.delete('0x0000000000000000000000000000000000000000');
          uniqueAddresses.delete('0xffffffffffffffffffffffffffffffffffffffff');
          uniqueAddresses.delete('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
          uniqueAddresses.delete('0x1000000000000000000000000000000000000000');
          chrome.runtime.sendMessage({addresses: Array.from(uniqueAddresses.values())});
        }
      );
  }
}


// etherscan light blue #3498db
// etherscan dark gray #979695
// etherscan dark blue #21325b

function App() {

  const [loading, setLoading] = useState<boolean>(false);
  const [tabData, setTabData] = useState<TabData| null>({favIconUrl: 'https://static.debank.com/image/matic_nft/local_url/5df849b06af0e9ea7bcbb8c1804304a4/59211315b16c0553e7e63bb5f536d37e.png', title: '', url: 'unknown'});
  const [serverLive, setServerLive] = useState<boolean>(false);
  const [noAddressDetected, setNoAddressDetected] = useState<boolean>(false);
  const [revealDetailedAnalysis, setRevealDetailedAnalysis] = useState<boolean>(false);

  const [analysisDone, setAnalysisDone] = useState<boolean>(false);

  const [percent, setPercent] = useState<number>(50);
  const [pgColor, setPgColor] = useState<string>('#3498db');


  const [verifiedERC20s, setVerifiedERC20s] = useState<TokenListToken[]>([]);


  const [indexingNecessary, setIndexingNecessary] = useState<boolean>(false);

  const [showTokens, setShowTokens] = useState<boolean>(false);
  const [showNfts, setShowNfts] = useState<boolean>(false);
  const [showUnverifiedContracts, setShowUnverifiedContracts] = useState<boolean>(false);
  const [showAllAddresses, setShowAllAddresses] = useState<boolean>(false);

  const [activeAddresses, setActiveAddresses] = useState<string[]>([]);
  const [nftTokens, setNftTokens] = useState<TokenListToken[]>([]);
  const [others, setOthers] = useState<string[]>([]);
  const [unverifiedContracts, setUnverifiedContracts] = useState<AddressCollection[]>([]);
  const [verifiedContracts, setVerifiedContracts] = useState<AddressCollection[]>([]);

  const nullTab: chrome.tabs.Tab = {
    active: false,
    audible: false,
    autoDiscardable: false,
    discarded: false,
    favIconUrl: '',
    height: 0,
    id: 0,} as chrome.tabs.Tab;
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab>(nullTab);


  function refreshTabData(at: chrome.tabs.Tab){
    console.log('refreshing message data');
    const activeTab = at;
    console.log('activeTab (found in react state)', activeTab);
    if(activeTab.id === 0) {
      return;
    }
    const urlCleaned = activeTab?.url?.split('/').slice(0, 3).join('/');
    const newTabData = {favIconUrl: activeTab?.favIconUrl, title: activeTab?.title, url: urlCleaned} as TabData;
    setTabData(newTabData);

  }

  function runScan(){
    setLoading(true);
    chrome.scripting.executeScript(
      {
        target: {tabId: activeTab.id || 0},
        func: getAddresses,
      },
      () => {
        // console.log('script executed);
      });
    const messages = localStorage.getItem('messages');
    let messagesArray = messages?.split(',') as string[];
    if (messagesArray[0] === '') {
      messagesArray = [];
      setLoading(false);
      setLoading(false);
      setAnalysisDone(true);
    }
    async function runAnalysis() {
      if (messagesArray.length === 0) {
        setActiveAddresses([]);
        setNoAddressDetected(true);
        return;
      }
      const data = {addresses: messagesArray};
      const res = await axios.post(`${process.env.REACT_APP_SERVER_URL}/analyze`, data);
      console.log('received addresses', res.data);
      console.log('received unverified contracts length', res.data.unverifiedContracts.length);
      console.log('received verified contracts length', res.data.verifiedContracts.length);
      setUnverifiedContracts(res.data.unverifiedContracts);
      setVerifiedContracts(res.data.verifiedContracts);
      setVerifiedERC20s(res.data.verifiedERC20s);
      const p = (1-(res.data.unverifiedContracts.length / (res.data.verifiedContracts.length + res.data.unverifiedContracts.length)))*100;
      console.log('p', p);
      setPercent(p);
      setPgColor(percentToColor(p));
      setLoading(false);
      setAnalysisDone(true);
    }
    runAnalysis();
  }

  async function livenessCheck() {
    const res = await axios.get(`${process.env.REACT_APP_SERVER_URL}/ping`);
    if (res.data === 'Server is running') {
      setServerLive(true);
    }
    console.log('livenesscheck', res.data);
  }

  useEffect(() => {
    // const placeHolderData = JSON.parse(JSON.stringify(unverifiedPlaceholder));
    // setNonVerified(placeHolderData);
    setLoading(false);
    livenessCheck();
    chrome.tabs && chrome.tabs.query({
    }, (tabs) => {
      const activeTab = tabs.find((tab) => tab.active);
      if (activeTab) {
        console.log('activeTab', activeTab);
        setActiveTab(activeTab);
        refreshTabData(activeTab);
      }else{
        console.log('no active tab');
      }
    });
    /*setInterval(() => {
      chrome.tabs && chrome.tabs.query({
      }, (tabs) => {
        const at = tabs.find((tab) => tab.active) as chrome.tabs.Tab;
        const activeTabId = localStorage.getItem('activeTab');
        const activeTabIdParsed = JSON.parse(activeTabId as string) as chrome.tabs.Tab;
        if(activeTabIdParsed?.id !== at.id || activeTabIdParsed === null) {
          localStorage.setItem('activeTab', JSON.stringify(at));
          setActiveTabId(at);
        } 
      });
    }, 100);*/
  }, []);

  const erc20PageProps: ERC20sPageProps = {
    showTokens: showTokens,
    setShowTokens: setShowTokens,
    serverLive: serverLive,
    erc20s: verifiedERC20s,
  };

  const nftsPageProps: ERC20sPageProps = {
    showTokens: showNfts,
    setShowTokens: setShowNfts,
    serverLive: serverLive,
    erc20s: nftTokens,
  };

  const unverifiedContractPageProps : ContractsPageProps = {
    contracts: unverifiedContracts,
    showContracts: showUnverifiedContracts,
    setShowContracts: setShowUnverifiedContracts,
  };


  return (
    <>
      {showTokens && <NewPage {...erc20PageProps}/>}
      {showNfts && <NewPage {...nftsPageProps}/>}
      {showUnverifiedContracts && <Contracts {...unverifiedContractPageProps}/>}
      {!showUnverifiedContracts && !showNfts &&!showTokens &&
        <body className='w-[340px] bg-white border-2'>
          <Header/>
          <div className='py-2'>
            <img src={tabData?.favIconUrl} alt="favicon" className='w-10 h-10 container'/>
            <div className="text-sm text-gray text-center py-2">
            Connected to: <a className="text-blue-400" href={tabData?.url} target="_blank" rel="noreferrer">{tabData?.url}</a>
            </div>
          </div>
          { !analysisDone && !loading &&
          <div className='grid grid-cols-3 py-2'>
            <div></div>
            <div className="ml-2.5">
              <button
                type="button"
                className="inline-flex items-center rounded-3xl border border-transparent bg-green-700 px-4 py-3 text-lg font-semibold leading-4 text-white shadow-sm hover:bg-green-400 focus:ring-green-400"
                onClick={(e) => {e.preventDefault(); runScan();}}
              >
                Scan
                <MagnifyingGlassIcon className="ml-2 h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div></div>
          </div>
          }
          {loading && 
            <div className="flex justify-center">
              <img src={blocksGif} className='h-20 w-20'/>
            </div>
          }
          {noAddressDetected && analysisDone && !loading && 
          <>
            <div className='flex items-center ml-7'>
              <SignalSlashIcon className="m-2 h-8 w-8 text-gray-800 inline" aria-hidden="true" />
              <div className="text-lg font-semibold">
              No addresses detected
              </div>
            </div>
          </>
          }
          {/*!noAddressDetected && analysisDone && ! */}
          {!noAddressDetected && analysisDone && !loading && 
          <div className="grid grid-cols-3">{/* Content goes here */}
            <div>
              <Circle className='h-[80px] w-[80px] mx-1' percent={percent} strokeWidth={10} strokeColor={pgColor} trailWidth={3} strokeLinecap="square"/>
            </div>
            <div className='text-sm font-semibold col-span-2 py-1'>
              {percent.toFixed(0)}% Verified Contracts
              <br/>
              Found {unverifiedContracts?.length} Unverified Contracts
              <br/>
              Over {unverifiedContracts.length+verifiedContracts.length} Contracts
              <br/>
              <button
                type="button"
                className="my-1 inline-flex items-center rounded border border-transparent bg-indigo-100 px-1 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 "
                onClick={(e) => {e.preventDefault(); setRevealDetailedAnalysis(!revealDetailedAnalysis);}}
              >
                {!revealDetailedAnalysis? ('Reveal') : ('Hide')} detailed analysis
              </button>
            </div>
          </div>
          }

          {revealDetailedAnalysis && !noAddressDetected && analysisDone && !loading && 
            <div className='text-center my-2 mx-2'>
              <dl className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3">
                <div className="rounded-md bg-white border-[0.5px] shadow-md px-4 py-5 sm:p-6 hover:bg-blue-100 hover:border-[0.5px] hover:border-blue-500" onClick={(e) => {e.preventDefault();setShowUnverifiedContracts(!showUnverifiedContracts);}}>
                  <dt className="text-xs text-blue-500">Unverified Contracts</dt>
                  <dd className="mt-1 text-sm font-semibold tracking-tight text-blue-500">{unverifiedContracts.length}</dd>
                </div>
                <div className="rounded-md bg-white border-[0.5px] shadow-md px-4 py-5 sm:p-6 hover:bg-blue-100 hover:border-[0.5px] hover:border-blue-500" onClick={(e) => {e.preventDefault();setShowTokens(!showTokens);}}> 
                  <dt className="text-xs text-blue-500">Verified ERC20s</dt>
                  <dd className="mt-1 text-sm font-semibold tracking-tight text-blue-500">{verifiedERC20s.length}</dd>
                </div>
                <div className="rounded-md bg-white border-[0.5px] shadow-md px-4 py-5 sm:p-6 hover:bg-blue-100 hover:border-[0.5px] hover:border-blue-500" onClick={(e) => {e.preventDefault();setShowNfts(!showNfts);}}>
                  <dt className="text-xs text-blue-500">NFT addresses</dt>
                  <dd className="mt-1 text-sm font-semibold tracking-tight text-blue-500">{nftTokens.length}</dd>
                </div>
                <div className="rounded-md bg-white border-[0.5px] shadow-md px-4 py-5 sm:p-6 hover:bg-blue-100 hover:border-[0.5px] hover:border-blue-500" onClick={(e)=>{e.preventDefault();}}>
                  <dt className="text-xs text-blue-500">Other Addresses</dt>
                  <dd className="mt-1 text-sm font-semibold tracking-tight text-blue-500">{others.length}</dd>
                </div>
              </dl>
            </div>
          }
          
          
          

          {/*{!loading && activeAddresses.length > 0 && !indexingNecessary && 
            <>
              <div className='ml-5 flex items-center font-semibold text-lg'>
                <CheckBadgeIcon className="h-8 w-8 m-2 text-blue-500 inline" aria-hidden="true" />
                <div className="text-lg font-semibold">
              Found {activeAddresses.length} verified contracts
                </div>
              </div>
              <div className='ml-5 flex items-center text-md font-semibold text-lg'>
                <ShieldExclamationIcon className="h-8 w-8 m-2 text-red-500 inline" aria-hidden="true" />
                <div className="text-lg font-semibold">
              Found {nonVerified?.length} unverified contracts
                </div>
              </div>
            </>
            }
            { !loading && activeAddresses.length > 0 && indexingNecessary && 
            <div className='ml-5 flex items-center'>
              <MagnifyingGlassIcon className="m-1 h-8 w-8 text-red-800 inline" aria-hidden="true" />
              <div className="text-lg font-semibold">
              Indexing.. Please wait a few minutes and refresh.
              </div>
            </div>
            }
          </div>
          <hr/>
        */}

          <div className='pl-1 py-1 text-center text-xs font-light'>
          Metascan all rights reserved.
          </div>
           
        </body>
      }
    </>

  );
}

export default App;
