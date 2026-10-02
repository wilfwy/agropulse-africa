"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
const DATA = [
  {d:"01/07",p:218},{d:"02/07",p:220.5},{d:"03/07",p:219},{d:"04/07",p:222},{d:"05/07",p:224},
  {d:"06/07",p:223},{d:"07/07",p:225},{d:"08/07",p:225,f:235},
];
export default function PriceChart(){
  return (<div style={{height:220}}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={DATA} margin={{top:5,right:10,left:-15,bottom:0}}>
        <XAxis dataKey="d" fontSize={11}/><YAxis fontSize={11} domain={[200,260]}/>
        <Tooltip/><Line type="monotone" dataKey="p" stroke="#2D6A4F" strokeWidth={2.5} dot={false} name="Prix réel"/>
        <Line type="monotone" dataKey="f" stroke="#F4A261" strokeDasharray="5 5" dot={false} name="Prévision IA"/>
      </LineChart>
    </ResponsiveContainer>
  </div>);
}
