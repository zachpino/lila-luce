const jsdom = require("jsdom");
import * as d3 from "d3";
const qrcode = require('qrcode')
const xmlserializer = require('xmlserializer');
import {svg2png} from 'svg-png-converter'

export const handler = async () => {

  const { JSDOM } = jsdom;
  const { document } = (new JSDOM('')).window;
  global.document = document;

  const width = 800;
  const height = 600;
  const initialOffset = 50;
  const hesitationScale = 1;
  const blurValue = 60;
  const mode = "Voronoi";
  const qrSize = 150;

  const inputs = [{"id":0,"start":"#6e40aa","end":"#aff05b","param":0.5,"hex":"#f96658","color":"rgb(249, 102, 88)","hesitation":1},{"id":1,"start":"#a83cb3","end":"#6bf75c","param":0.5,"hex":"#ff7636","color":"rgb(255, 118, 54)","hesitation":1},{"id":2,"start":"#df40a1","end":"#34f07e","param":0.5,"hex":"#ec9322","color":"rgb(236, 147, 34)","hesitation":1},{"id":3,"start":"#ff507a","end":"#1bd9ac","param":0.5,"hex":"#bda92b","color":"rgb(189, 169, 43)","hesitation":1},{"id":4,"start":"#ff704e","end":"#1fb3d3","param":0.5,"hex":"#c589ec","color":"rgb(197, 137, 236)","hesitation":1},{"id":5,"start":"#f89b31","end":"#3988e1","param":0.5,"hex":"#f566b6","color":"rgb(245, 102, 182)","hesitation":1},{"id":6,"start":"#d2c934","end":"#585fd2","param":0.5,"hex":"#ff587d","color":"rgb(255, 88, 125)","hesitation":1}]

  const vizData = inputs.map((d, i) => ({
    ...d,
    x:
    Math.cos((i / (inputs.length+1)) * Math.PI * 2) *
    (initialOffset + d.hesitation * hesitationScale) +
    width / 2,

    y:
    Math.sin((i / (inputs.length+1)) * Math.PI * 2) *
    (initialOffset + d.hesitation * hesitationScale) +
    height / 2
  }));

  const delaunay = d3.Delaunay.from(vizData.map((d, i) => [d.x, d.y]));

  const voronoi = delaunay.voronoi([0, 0, width, height]);

  const cells = vizData.map((pt, i) => ({
    ...pt,
    cell: voronoi.renderCell(i)
  }));

  var body = d3.select(document).select("body");

  var svg = body.append("svg")
  .attr("width", width)
  .attr("height", height);


  const filter = svg
  .append("filter")
  .attr("id", "blur")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", width)
  .attr("height", height)
  .attr("filterUnits", "userSpaceOnUse");

  filter
  .append("feFlood")
    //.attr("flood-opacity", "100")
  .attr("result", "BackgroundImageFix");

  filter
  .append("feBlend")
  .attr("mode", "normal")
  .attr("in", "SourceGraphic")
  .attr("in2", "BackgroundImageFix")
  .attr("result", "shape");

  filter
  .append("feGaussianBlur")
  .attr("stdDeviation", blurValue)
  .attr("result", "effect1_foregroundBlur_20_90");

  const blurred = svg.append("g").attr("filter", "url(#blur)");

  let cellPaths;
  if (mode == "Voronoi") {
    cellPaths = blurred
    .selectAll()
    .data(cells)
    .enter()
    .append("path")
    .attr("class", "blobs")
    .attr("d", (d) => d.cell)
    .attr("fill", (d) => d.color)
    .attr("transform", "translate(0,0)");
  } else if (mode == "Circles") {
    blurred
    .append("rect")
    .attr("x", -width)
    .attr("y", -height)
    .attr("width", width * 3)
    .attr("height", height * 3)
    .attr("fill", "white");

    cellPaths = blurred
    .selectAll()
    .data(cells)
    .enter()
    .append("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", circleRadius)
    .attr("fill", (d) => d.color);
  }

  const unBlurred = svg.append("g").attr("fill", "white");

  
  const qrCodeData = inputs
  .map((d) => [d.param, d.hex, d.hesitation].join(","))
  .join("\n");

  const qrDataUrl = await qrcode.toDataURL(qrCodeData);

  const qrX = width / 2 - qrSize / 2;

  const qrY = height / 2 - qrSize / 2;

  unBlurred
  .append("image")
  .attr("href", qrDataUrl)
  .attr("width", qrSize)
  .attr("height", qrSize)
  .attr("x", qrX)
  .attr("y", qrY);
  

  // Serialize it as xml string:
  const svgAsXML = await xmlserializer.serializeToString(svg.node());

  let s = await svg2png({ 
  input: svgAsXML,
  encoding: 'dataURL', 
  format: 'png',
  width: 800,
  height: 600,
  multiplier: 1,
  quality: 1
  })


  return {
    statusCode: 200,
    body: JSON.stringify({
      message:s
    }),
  }
}