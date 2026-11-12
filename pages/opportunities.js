import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Thrive Family Fun Center","city":"","state":"","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Anchorage 5th Avenue Mall","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Bentley Mall","city":"Fairbanks","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Dimond Center","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Auburn Mall","city":"Auburn","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Eastdale Mall","city":"Montgomery","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Parkway Place","city":"Huntsville","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"The Shoppes at Bel Air","city":"Mobile","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Central Mall","city":"Fort Smith","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Hot Springs Mall","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"McCain Mall","city":"North Little Rock","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Northwest Arkansas Mall","city":"Fayetteville","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Northwest Arkansas Mall - Fayetteville","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Park Plaza Mall","city":"Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Superstition Springs Center","city":"","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Tucson Mall","city":"Tucson","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Centerpoint Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Eagle Rock Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fashion Square","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Ferry Building Marketplace","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Galleria at Roseville","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Great Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Hemet Valley Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Inland Center Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lakewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Los Cerritos Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Merced Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Mission Viejo (The Shops at)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Moreno Valley Mall At Towngate","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Ontario Mills","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Panorama Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Plaza Bonita","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Puente Hills Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Santa Rosa Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"South Bay Galleria","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Stonewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Oaks Shopping Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Valencia Town Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Victor Valley (The Mall of)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Vintage Faire Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Westfield Century City","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Culver City","city":"Culver City","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"FlatIron Crossing","city":"Broomfield","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Brass Mill Center","city":"Waterbury","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Connecticut Post Mall","city":"Milford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Westfarms","city":"West Hartford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Concord Mall","city":"Wilmington","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Dover Mall","city":"Dover","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Brandon Town Center","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Broward Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"International Plaza","city":"Tampa","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Miami International Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Oviedo Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Southland Mall - Cutler Bay","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Mall at Millenia","city":"Orlando","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"University Mall - Tampa","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"North Point Mall","city":"Alpharetta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Perimeter Mall","city":"Dunwoody","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Ponce City Market","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Jamestown","address":"","contact":""},
  {"name":"Southlake Mall - Morrow","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Sugarloaf Mills Mall","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Kahala Mall","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Pearlridge Center","city":"Aiea","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Coral Ridge Mall","city":"Coralville","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Jordan Creek Town Center","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"NorthPark Mall - Davenport","city":"","state":"IA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Valley West Mall","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Boise Towne Square","city":"Boise","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Grand Teton Mall","city":"Idaho Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Magic Valley Mall","city":"Twin Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Chicago Premium Outlets","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fashion Outlets of Chicago","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Orland Square Shopping Center","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Water Tower Place","city":"Chicago","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Westfield Old Orchard","city":"Skokie","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"White Oaks Mall","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Eastland Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fashion Mall at Keystone","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Greenwood Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lighthouse Place Premium Outlets","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Tippecanoe Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"University Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Oak Park Mall","city":"Overland Park","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Town Center Plaza","city":"Leawood","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Towne East Square","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West Ridge Mall","city":"Topeka","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West Ridge Mall","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fayette Mall","city":"Lexington","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mall St. Matthews","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Oxmoor Center","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lakeside Shopping Center","city":"Metairie","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Prien Lake Mall","city":"","state":"LA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Esplanade","city":"Kenner","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"CambridgeSide","city":"Cambridge","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Northshore Mall","city":"Peabody","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Quincy Market","city":"Boston","state":"MA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"South Shore Plaza","city":"Braintree","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Bangor Mall","city":"Bangor","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","address":"","contact":""},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Great Lakes Crossing","city":"Auburn Hills","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Somerset Collection","city":"Troy","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Twelve Oaks Mall","city":"Novi","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","address":"","contact":""},
  {"name":"Mall of America","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Ridgedale Center","city":"Minnetonka","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Rosedale Center","city":"Roseville","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southdale Center","city":"Edina","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southdale Shopping Center - Edina","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Twin Cities Premium Outlets","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Independence Center","city":"Independence","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Saint Louis Galleria","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West County Center","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Edgewater Mall","city":"Biloxi","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mall at Barnes Crossing","city":"Tupelo","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Northpark Mall","city":"Ridgeland","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Holiday Village Mall","city":"Great Falls","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Rimrock Mall","city":"Billings","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southgate Mall","city":"Missoula","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Concord Mills","city":"","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"CBL & Associates","address":"","contact":""},
  {"name":"Hanes Mall","city":"Winston-Salem","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"SouthPark","city":"Charlotte","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Streets at Southpoint","city":"Durham","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Kirkwood Mall","city":"Bismarck","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West Acres Shopping Center","city":"Fargo","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Gateway Mall","city":"Lincoln","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Westroads Mall","city":"Omaha","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Pheasant Lane Mall","city":"Nashua","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Mall at Rockingham Park","city":"Salem","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Mall of New Hampshire","city":"Manchester","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","address":"","contact":""},
  {"name":"Cherry Hill Mall","city":"Cherry Hill","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Mills at Jersey Gardens","city":"","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Westfield Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"ABQ Uptown","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Coronado Center","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Cottonwood Mall","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Rio West Mall","city":"","state":"NM","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Fashion Show","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Galleria at Sunset","city":"Henderson","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Meadows Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Chelsea Market","city":"New York","state":"NY","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Crossgates Mall","city":"Albany","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Pyramid Management","address":"","contact":""},
  {"name":"Fashion Outlets - Niagara Falls","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"Green Acres Mall","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Kings Plaza Shopping Center","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Queens Center","city":"Elmhurst","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Wilton Mall at Saratoga","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Cincinnati Premium Outlets","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Eastgate Mall","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Easton Town Center","city":"Columbus","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Eastwood Mall Complex","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Findlay Market","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Kenwood Towne Centre","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"SouthPark Mall","city":"Strongsville","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Summit Mall","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Tuttle Crossing (The Mall at)","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West Side Market","city":"Cleveland","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Penn Square Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Quail Springs Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Woodland Hills Mall","city":"Tulsa","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Woodland Hills Mall","city":"","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Clackamas Town Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Fubonn Shopping Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lloyd Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Valley River Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Washington Square","city":"Tigard","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Washington Square","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Franklin Mills, PA (FKA Philadelphia Mills)","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Grove City Premium Outlets","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Millcreek Mall","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Reading Terminal Market","city":"Philadelphia","state":"PA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"Ross Park Mall","city":"Pittsburgh","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Mall at Robinson","city":"Robinson Township","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Willow Grove Park","city":"Willow Grove","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Providence Place","city":"Providence","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Warwick Mall","city":"Warwick","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Coastal Grand Mall","city":"Myrtle Beach","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Columbiana Centre","city":"Columbia","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Rushmore Mall","city":"Rapid City","state":"SD","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Assembly Food Hall","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"CoolSprings Galleria","city":"Franklin","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Stones River Mall","city":"","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"West Town Mall","city":"Knoxville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Wolfchase Galleria","city":"Memphis","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","address":"","contact":""},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Broadway Square Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Grapevine Mills","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Houston Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Katy Mills","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"La Plaza Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Lakeline Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Memorial City Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Midland Park Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Music City Mall - Odessa TX","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"North East Mall - Hurst","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"North Star Mall","city":"San Antonio","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Rivercenter","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"San Marcos Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"South Plains Mall - Lubbock","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Fashion Place","city":"Murray","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"University Place","city":"Orem","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Valley Fair Mall","city":"","state":"UT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"MacArthur Center","city":"Norfolk","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","address":"","contact":""},
  {"name":"Short Pump Town Center","city":"Richmond","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Spotsylvania Towne Centre","city":"","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","address":"","contact":""},
  {"name":"University Mall","city":"South Burlington","state":"VT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"University Mall","city":"","state":"VT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Alderwood","city":"Lynnwood","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Bellevue Square","city":"Bellevue","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Northgate","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Pike Place Market","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","address":"","contact":""},
  {"name":"South Hill Mall - Puyallup","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southcenter","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Tacoma Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Wenatchee Valley Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Westfield Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","address":"","contact":""},
  {"name":"Bayshore","city":"Glendale","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"East Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Mayfair Mall","city":"Wauwatosa","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Miller Hill Mall","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Southridge Mall - Greendale","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Charleston Town Center","city":"Charleston","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Huntington Mall","city":"Barboursville","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Eastridge Mall","city":"Casper","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""},
  {"name":"Frontier Mall","city":"Cheyenne","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","address":"","contact":""}
];

const STATES = [...new Set(VENUES.map((v) => v.state))].sort();
const OWNERS = [...new Set(VENUES.map((v) => v.owner).filter(Boolean))].sort();
const TYPES = [...new Set(VENUES.map((v) => v.type))].sort();

export default function Opportunities() {
  const router = useRouter();
  const { session } = useAuth();
  const [stateFilter, setStateFilter] = useState('All');
  const [chairFilter, setChairFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  function navigate(code) {
    if (code === 'admin-users') return router.push('/admin/users');
    if (code === 'admin-import') return router.push('/admin/import');
    if (code === 'loc') return router.push('/');
    if (code === 'tasks') return router.push('/tasks');
    if (code === 'mo') return router.push('/monthly');
    if (code === 'financials') return router.push('/financials');
    if (code === 'reporting') return router.push('/reporting');
    if (code === 'risk') return router.push('/risk');
  }

  const filtered = useMemo(() => {
    return VENUES.filter((v) => {
      if (stateFilter !== 'All' && v.state !== stateFilter) return false;
      if (chairFilter === 'Has chairs' && !v.hasSmarteCarte) return false;
      if (chairFilter === 'No chairs' && v.hasSmarteCarte) return false;
      if (ownerFilter !== 'All' && v.owner !== ownerFilter) return false;
      if (typeFilter !== 'All' && v.type !== typeFilter) return false;
      return true;
    });
  }, [stateFilter, chairFilter, ownerFilter, typeFilter]);

  return (
    <Layout active="risk" onNavigate={navigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Indoor Malls & Food Halls</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Full list across all 50 states. Type and owner shown where known. Flagged if Smarte Carte has massage chairs. {VENUES.length} venues. Address and contact ready to fill.
      </p>

      <div className="inline-form">
        <label>
          State
          <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Owner
          <select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            {OWNERS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>
          Massage chairs
          <select value={chairFilter} onChange={(e) => { setChairFilter(e.target.value); setSelected(null); }}>
            <option>All</option>
            <option>Has chairs</option>
            <option>No chairs</option>
          </select>
        </label>
        <span className="muted" style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
          {filtered.length} shown
        </span>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Venues</h3>
          {filtered.length === 0 && <p className="muted">None match filters.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((v) => (
              <button
                key={v.name + v.state}
                type="button"
                className="btn btn-ghost"
                style={{
                  textAlign: 'left',
                  background: selected?.name === v.name && selected?.state === v.state ? 'var(--ember)' : 'transparent',
                  color: selected?.name === v.name && selected?.state === v.state ? '#fff' : 'var(--ink)',
                  border: '1px solid var(--iron)',
                }}
                onClick={() => setSelected(v)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong>{v.name}</strong>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: v.hasSmarteCarte ? '#fdeceb' : '#e8f5e9',
                    color: v.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32',
                    whiteSpace: 'nowrap',
                  }}>
                    {v.hasSmarteCarte ? 'Has chairs' : 'Open'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{v.city}, {v.state} · {v.type}</div>
                {v.owner && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{v.owner}</div>}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Detail</h3>
          {!selected && <p className="muted">Select a venue to see details.</p>}
          {selected && (
            <>
              <p style={{ margin: '0 0 8px' }}><strong>{selected.name}</strong></p>
              <p className="muted" style={{ margin: '0 0 12px' }}>{selected.city}, {selected.state}</p>
              <p style={{ margin: '0 0 8px' }}>Type: {selected.type}</p>
              <p style={{ margin: '0 0 8px' }}>Owner: {selected.owner || '—'}</p>
              <p style={{ margin: '0 0 16px' }}>
                Smarte Carte massage chairs: <strong style={{ color: selected.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32' }}>
                  {selected.hasSmarteCarte ? 'Yes — skip' : 'No — potential'}
                </strong>
              </p>
              {selected.address && <p style={{ margin: '0 0 8px' }}>Address: {selected.address}</p>}
              {selected.contact && <p style={{ margin: '0 0 8px' }}>Contact: {selected.contact}</p>}
              <p style={{ marginTop: 12 }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name + ' ' + selected.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open in Google Maps
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
