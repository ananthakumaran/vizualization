import {
  scaleLog,
  scaleThreshold,
  geoPath,
  select,
  geoMercator,
  extent,
  axisBottom,
  scaleLinear,
  scaleSqrt
} from 'd3';
import {
  schemeOrRd
} from 'd3-scale-chromatic';
import india from './data/india.json';
import indiaStates from './data/india.states.json';
import population from './data/population.json';
import {
  feature,
} from 'topojson-client';

import {
  map,
  each
} from 'underscore';

let height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

let districts = feature(india, india.objects['-']);
let states = feature(indiaStates, indiaStates.objects['-']);
const b = india.bbox;
const pad = 30;
let projection = geoMercator()
    .fitExtent([[pad, pad], [width - pad, height - pad]], districts);



function density(data) {
  if (!data || !data.total || !data.Area) {
    return 0;
  }
  return (data.total / data.Area).toFixed(2);
}
let districtPopulation = [];
each(population, (d) => {
  const code = parseInt(d.District.replace(/[^0-9]/g, ''), 10);
  d['District'] = code;
  d['total'] = parseInt(d["Total Population Person"], 10);
  d['Area'] = parseInt(d.Area, 10);
  districtPopulation[code] = d;
});

let path = geoPath().projection(geoMercator().fitSize([1000, 1000], districts));
let normalized = map(districts.features, (d) => {
  let data = districtPopulation[d.properties.censuscode];
  return density(data);
});

function title(properties) {
  let data = districtPopulation[properties.censuscode] || {};
  let den = density(data) ? density(data) + " km²" : "Data Not Available";
  let ar = data.Area ? data.Area + " km²" : "Data Not Available";
  return `Density: ${den}\nTotal: ${data.total || "Data Not Available"}\nArea: ${ar}\nDistrict: ${properties.DISTRICT}\nState: ${properties.ST_NM}`;
}

let domain = extent(normalized);
const threshold = map([100, 200, 300, 500, 1000, 2000, 10000, 20000], x => x * 1);
let color = scaleThreshold()
    .domain(threshold)
    .range(schemeOrRd[9]);

let svg = select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("g")
  .attr("class", "districts")
  .selectAll("path")
  .data(districts.features)
  .enter().append("path")
  .attr("d", geoPath().projection(projection))
  .style("fill", (d, i) => color(normalized[i]))
  .append("title")
  .text((d) => title(d.properties));

svg.append("g")
  .attr("class", "states")
  .selectAll("path")
  .data(states.features)
  .enter().append("path")
  .attr("d", geoPath().projection(projection))
  .attr("stroke", "#000")
  .attr("stroke-width", 0.5)
  .attr("stroke-opacity", 0.2)
  .style("fill", 'none');

let x = scaleSqrt()
    .domain([0, 45000])
    .rangeRound([0, width]);

let g = svg.append("g")
    .attr("class", "key");

g.selectAll("rect")
  .data(color.range().map(function(d) {
    d = color.invertExtent(d);
    if (d[0] == null) d[0] = x.domain()[0];
    if (d[1] == null) d[1] = x.domain()[1];
    return d;
  }))
  .enter().append("rect")
  .attr("height", 8)
  .attr("x", function(d) { return x(d[0]); })
  .attr("width", function(d) { return x(d[1]) - x(d[0]); })
  .attr("fill", function(d) { return color(d[0]); });

g.call(axisBottom(x)
       .tickSize(13)
       .tickValues(color.domain()))
  .select(".domain")
  .remove();
