import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Thrive Family Fun Center","city":"","state":"","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Anchorage 5th Avenue Mall","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"320 W 5th Ave., Anchorage, AK 99501","phone":"(907) 258-4003","email":""},
  {"name":"Bentley Mall","city":"Fairbanks","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Dimond Center","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Auburn Mall","city":"Auburn","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"385 Southbridge St, Auburn, MA 01501","phone":"(508) 832-2314","email":""},
  {"name":"Eastdale Mall","city":"Montgomery","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Parkway Place","city":"Huntsville","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"2000 Riverchase Galleria, Hoover, AL 35244","phone":"(205) 985-3000","email":""},
  {"name":"The Shoppes at Bel Air","city":"Mobile","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Central Mall","city":"Fort Smith","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Hot Springs Mall","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"McCain Mall","city":"North Little Rock","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Northwest Arkansas Mall","city":"Fayetteville","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Northwest Arkansas Mall - Fayetteville","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Park Plaza Mall","city":"Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"5000 S Arizona Mills Cir, Tempe, AZ 85282","phone":"(480) 491-7300","email":""},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7700 W Arrowhead Towne Center, Glendale, AZ 85308","phone":"(623) 979-7720","email":""},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"","phone":"","email":""},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7014 E Camelback Rd, Scottsdale, AZ 85251","phone":"(480) 990-7800","email":""},
  {"name":"Superstition Springs Center","city":"","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Tucson Mall","city":"Tucson","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1065 Brea Mall, Brea, CA 92821","phone":"(714) 990-2732","email":""},
  {"name":"Centerpoint Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3525 Carson St, Torrance, CA 90503","phone":"(310) 542-8525","email":""},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Eagle Rock Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Fashion Square","city":"Sherman Oaks","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"14006 Riverside Drive, Sherman Oaks, CA 91423","phone":"(480) 990-7800","email":""},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7007 Friars Rd, San Diego, CA 92108","phone":"(619) 297-3381","email":""},
  {"name":"Ferry Building Marketplace","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":""},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":""},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"","phone":"","email":""},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"447 Great Mall Dr, Milpitas, CA 95035","phone":"","email":""},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"447 Great Mall Dr, Milpitas, CA 95035","phone":"","email":""},
  {"name":"Hemet Valley Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Inland Center Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lakewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Los Cerritos Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Merced Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Mission Viejo (The Shops at)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Moreno Valley Mall At Towngate","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Ontario Mills","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Panorama Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Plaza Bonita","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Puente Hills Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Santa Rosa Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"South Bay Galleria","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Stonewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Oaks Shopping Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Valencia Town Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Victor Valley (The Mall of)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Vintage Faire Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Westfield Century City","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"10250 Santa Monica Blvd., Los Angeles, CA 90067","phone":"","email":""},
  {"name":"Westfield Culver City","city":"Culver City","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6000 Sepulveda Boulevard, Culver City, CA 90230","phone":"","email":""},
  {"name":"Westfield Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":""},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6600 Topanga Canyon Boulevard, Canoga Park, CA 91303","phone":"","email":""},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2855 Stevens Creek Blvd., Santa Clara, CA 95050","phone":"(408) 248-4450","email":""},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3000 E 1st Avenue, Denver, CO 80206","phone":"(303) 388-3900","email":""},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"14500 W Colfax Ave, Lakewood, CO 80401","phone":"(303) 590-1634","email":""},
  {"name":"FlatIron Crossing","city":"Broomfield","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"","phone":"","email":""},
  {"name":"Brass Mill Center","city":"Waterbury","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Connecticut Post Mall","city":"Milford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7 Backus Ave, Danbury, CT 06810","phone":"(203) 743-3247","email":""},
  {"name":"Westfarms","city":"West Hartford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"132 Christiana Mall, Newark, DE 19702","phone":"(302) 731-9815","email":""},
  {"name":"Concord Mall","city":"Wilmington","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Dover Mall","city":"Dover","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"1365 N DuPont Hwy, Dover, DE 19901","phone":"(302) 678-4000","email":""},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Brandon Town Center","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Broward Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"International Plaza","city":"Tampa","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Miami International Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Oviedo Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Southland Mall - Cutler Bay","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Mall at Millenia","city":"Orlando","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"University Mall - Tampa","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"North Point Mall","city":"Alpharetta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Perimeter Mall","city":"Dunwoody","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Ponce City Market","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Jamestown","operatedBy":"Jamestown","address":"","phone":"","email":""},
  {"name":"Southlake Mall - Morrow","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Sugarloaf Mills Mall","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1450 Ala Moana Blvd, Honolulu, HI 96814","phone":"(808) 955-9517","email":""},
  {"name":"Kahala Mall","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Pearlridge Center","city":"Aiea","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Coral Ridge Mall","city":"Coralville","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Jordan Creek Town Center","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"NorthPark Mall - Davenport","city":"","state":"IA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Valley West Mall","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Boise Towne Square","city":"Boise","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Grand Teton Mall","city":"Idaho Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Magic Valley Mall","city":"Twin Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Chicago Premium Outlets","city":"Aurora","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1650 Premium Outlet Blvd, Aurora, IL 60502","phone":"(630) 692-1451","email":""},
  {"name":"Fashion Outlets of Chicago","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"100 Oakbrook Center, Oak Brook, IL 60523","phone":"(630) 573-0700","email":""},
  {"name":"Orland Square Shopping Center","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Water Tower Place","city":"Chicago","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Westfield Old Orchard","city":"Skokie","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"4905 Old Orchard Center, Skokie, IL 60077","phone":"","email":""},
  {"name":"White Oaks Mall","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"6020 E 82nd St, Indianapolis, IN 46250","phone":"(317) 849-9994","email":""},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2894 E 3rd St, Bloomington, IN 47401","phone":"(812) 339-9370","email":""},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Eastland Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Fashion Mall at Keystone","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Greenwood Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lighthouse Place Premium Outlets","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Tippecanoe Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"University Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Oak Park Mall","city":"Overland Park","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Town Center Plaza","city":"Leawood","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Towne East Square","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West Ridge Mall","city":"Topeka","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West Ridge Mall","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Fayette Mall","city":"Lexington","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mall St. Matthews","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Oxmoor Center","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lakeside Shopping Center","city":"Metairie","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"6401 Bluebonnet Blvd, Baton Rouge, LA 70836","phone":"(225) 761-7220","email":""},
  {"name":"Prien Lake Mall","city":"","state":"LA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Esplanade","city":"Kenner","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"75 Middlesex Turnpike, Burlington, MA 01803","phone":"(781) 272-8668","email":""},
  {"name":"CambridgeSide","city":"Cambridge","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1245 Worcester St, Natick, MA 01760","phone":"(508) 655-4800","email":""},
  {"name":"Northshore Mall","city":"Peabody","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Quincy Market","city":"Boston","state":"MA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"South Shore Plaza","city":"Braintree","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7000 Arundel Mills Cir, Hanover, MD 21076","phone":"(410) 540-5110","email":""},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"10300 Little Patuxent Pkwy, Columbia, MD 21044","phone":"(410) 730-3300","email":""},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"825 Dulaney Valley Rd, Towson, MD 21204","phone":"(410) 825-3535","email":""},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"7101 Democracy Boulevard, Bethesda, MD 20817","phone":"(301) 469-6000","email":""},
  {"name":"Bangor Mall","city":"Bangor","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"","phone":"","email":""},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"100 Briarwood Cir, Ann Arbor, MI 48108","phone":"(734) 769-9610","email":""},
  {"name":"Great Lakes Crossing","city":"Auburn Hills","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"4000 Baldwin Road, Auburn Hills, MI 48326","phone":"(248) 454-5010","email":""},
  {"name":"Somerset Collection","city":"Troy","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Twelve Oaks Mall","city":"Novi","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"","phone":"","email":""},
  {"name":"Mall of America","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Ridgedale Center","city":"Minnetonka","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Rosedale Center","city":"Roseville","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Southdale Center","city":"Edina","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Southdale Shopping Center - Edina","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Twin Cities Premium Outlets","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2825 S Glenstone Ave, Springfield, MO 65804","phone":"(417) 883-4111","email":""},
  {"name":"Independence Center","city":"Independence","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Saint Louis Galleria","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West County Center","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Edgewater Mall","city":"Biloxi","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mall at Barnes Crossing","city":"Tupelo","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Northpark Mall","city":"Ridgeland","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Holiday Village Mall","city":"Great Falls","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Rimrock Mall","city":"Billings","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Southgate Mall","city":"Missoula","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Concord Mills","city":"Concord","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"8111 Concord Mills Blvd, Concord, NC 28027","phone":"(704) 979-0001","email":""},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"CBL & Associates","operatedBy":"CBL & Associates","address":"","phone":"","email":""},
  {"name":"Hanes Mall","city":"Winston-Salem","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"SouthPark","city":"Charlotte","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Streets at Southpoint","city":"Durham","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Kirkwood Mall","city":"Bismarck","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West Acres Shopping Center","city":"Fargo","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Gateway Mall","city":"Lincoln","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Westroads Mall","city":"Omaha","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Pheasant Lane Mall","city":"Nashua","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Mall at Rockingham Park","city":"Salem","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Mall of New Hampshire","city":"Manchester","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"","phone":"","email":""},
  {"name":"Cherry Hill Mall","city":"Cherry Hill","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1750 Deptford Center Rd, Deptford, NJ 08096","phone":"(856) 848-0400","email":""},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"3710 US-9, Freehold, NJ 07728","phone":"(732) 577-1144","email":""},
  {"name":"Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":""},
  {"name":"The Mills at Jersey Gardens","city":"","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Westfield Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":""},
  {"name":"ABQ Uptown","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Coronado Center","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Cottonwood Mall","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Rio West Mall","city":"","state":"NM","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Fashion Show","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Galleria at Sunset","city":"Henderson","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Meadows Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Chelsea Market","city":"New York","state":"NY","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Crossgates Mall","city":"Albany","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Pyramid Management","operatedBy":"Pyramid Management","address":"","phone":"","email":""},
  {"name":"Fashion Outlets - Niagara Falls","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"2034 Green Acres Mall, Valley Stream, NY 11581","phone":"(516) 561-1157","email":""},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"2034 Green Acres Mall, Valley Stream, NY 11581","phone":"(516) 561-1157","email":""},
  {"name":"Kings Plaza Shopping Center","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Queens Center","city":"Elmhurst","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Wilton Mall at Saratoga","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Cincinnati Premium Outlets","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Eastgate Mall","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Easton Town Center","city":"Columbus","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Eastwood Mall Complex","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Findlay Market","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Kenwood Towne Centre","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"SouthPark Mall","city":"Strongsville","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Summit Mall","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Tuttle Crossing (The Mall at)","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West Side Market","city":"Cleveland","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Penn Square Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Quail Springs Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Woodland Hills Mall","city":"Tulsa","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Woodland Hills Mall","city":"","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Clackamas Town Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Fubonn Shopping Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lloyd Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Valley River Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Washington Square","city":"Tigard","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Washington Square","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Franklin Mills, PA (FKA Philadelphia Mills)","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Grove City Premium Outlets","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Millcreek Mall","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Reading Terminal Market","city":"Philadelphia","state":"PA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Ross Park Mall","city":"Pittsburgh","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Mall at Robinson","city":"Robinson Township","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Willow Grove Park","city":"Willow Grove","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Providence Place","city":"Providence","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Warwick Mall","city":"Warwick","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Coastal Grand Mall","city":"Myrtle Beach","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Columbiana Centre","city":"Columbia","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Rushmore Mall","city":"Rapid City","state":"SD","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Assembly Food Hall","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"CoolSprings Galleria","city":"Franklin","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Stones River Mall","city":"","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"West Town Mall","city":"Knoxville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Wolfchase Galleria","city":"Memphis","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2901 S Capital of Texas Hwy, Austin, TX 78746","phone":"(512) 327-7041","email":""},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"4601 S Broadway Ave, Tyler, TX 75703","phone":"(903) 561-7055","email":""},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"4601 S Broadway Ave, Tyler, TX 75703","phone":"(903) 561-7055","email":""},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"8401 Gateway Blvd W, El Paso, TX 79925","phone":"(915) 779-7071","email":""},
  {"name":"Grapevine Mills","city":"Grapevine","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3000 Grapevine Mills Pkwy, Grapevine, TX 76051","phone":"(972) 724-4910","email":""},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Houston Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Katy Mills","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"La Plaza Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Lakeline Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Memorial City Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Midland Park Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Music City Mall - Odessa TX","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"North East Mall - Hurst","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"North Star Mall","city":"San Antonio","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Rivercenter","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"San Marcos Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"South Plains Mall - Lubbock","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Fashion Place","city":"Murray","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"University Place","city":"Orem","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Valley Fair Mall","city":"","state":"UT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"MacArthur Center","city":"Norfolk","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":""},
  {"name":"Short Pump Town Center","city":"Richmond","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Spotsylvania Towne Centre","city":"","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1961 Chain Bridge Rd, Tysons, VA 22102","phone":"(703) 893-9401","email":""},
  {"name":"University Mall","city":"South Burlington","state":"VT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"University Mall","city":"","state":"VT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Alderwood","city":"Lynnwood","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Bellevue Square","city":"Bellevue","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Northgate","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Pike Place Market","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":""},
  {"name":"South Hill Mall - Puyallup","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":""},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":""},
  {"name":"Tacoma Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Wenatchee Valley Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Westfield Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":""},
  {"name":"Bayshore","city":"Glendale","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"East Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Mayfair Mall","city":"Wauwatosa","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Miller Hill Mall","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Southridge Mall - Greendale","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Charleston Town Center","city":"Charleston","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Huntington Mall","city":"Barboursville","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Eastridge Mall","city":"Casper","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""},
  {"name":"Frontier Mall","city":"Cheyenne","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":""}
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
              <p style={{ margin: '0 0 8px' }}>Operated by: {selected.operatedBy || '—'}</p>
              <p style={{ margin: '0 0 8px' }}>Address: {selected.address || '—'}</p>
              <p style={{ margin: '0 0 8px' }}>Phone: {selected.phone || '—'}</p>
              <p style={{ margin: '0 0 8px' }}>Email: {selected.email || '—'}</p>
              <p style={{ margin: '0 0 16px' }}>
                Smarte Carte massage chairs: <strong style={{ color: selected.hasSmarteCarte ? 'var(--ember-muted)' : '#2e7d32' }}>
                  {selected.hasSmarteCarte ? 'Yes — skip' : 'No — potential'}
                </strong>
              </p>
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
