import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../lib/firebaseClient';

const VENUES = [
  {"name":"Thrive Family Fun Center","city":"","state":"","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Anchorage 5th Avenue Mall","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"320 W 5th Ave., Anchorage, AK 99501","phone":"(907) 258-4003","email":"simon-0115@simon.com","website":"http://www.shopsimon.com","notes":""},
  {"name":"Bentley Mall","city":"Fairbanks","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Dimond Center","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dimond Blvd. & Old Seward Hwy., Anchorage, AK 99515-2028","phone":"","email":"leasing@dimondcenter.com","website":"http://www.dimondcenter.com","notes":""},
  {"name":"Auburn Mall","city":"Auburn","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"385 Southbridge St, Auburn, MA 01501","phone":"(508) 832-2314","email":"","website":"","notes":""},
  {"name":"Eastdale Mall","city":"Montgomery","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Atlanta Highway & Eastern Blvd., Montgomery, AL 36117","phone":"","email":"","website":"http://www.aronov.com","notes":""},
  {"name":"Parkway Place","city":"Huntsville","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Memorial Pkwy.(U.S.231) & Drake Ave., Huntsville, AL 35801","phone":"","email":"","website":"http://www.parkwayplacemall.com","notes":""},
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"2000 Riverchase Galleria, Hoover, AL 35244","phone":"(205) 985-3000","email":"","website":"http://www.riverchasegalleria.com","notes":""},
  {"name":"The Shoppes at Bel Air","city":"Mobile","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Airport Blvd. & I-65 Service Rd., Mobile, AL 36606","phone":"","email":"","website":"http://www.shopatbelairmall.com","notes":""},
  {"name":"Central Mall","city":"Fort Smith","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rogers Ave. & Waldron Rd., Fort Smith, AR 72903","phone":"","email":"","website":"http://www.centralmallfortsmith.com","notes":""},
  {"name":"Hot Springs Mall","city":"Hot Springs","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Central Ave. & Mall Drive, Hot Springs, AR 71913","phone":"","email":"","website":"http://www.shopmalls.com","notes":""},
  {"name":"McCain Mall","city":"North Little Rock","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 67-167 & McCain Blvd., North Little Rock, AR 72116","phone":"","email":"simon-2547@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Northwest Arkansas Mall","city":"Fayetteville","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Rt. 71B & Zion Road, Fayetteville, AR 72703-5123","phone":"","email":"","website":"http://www.northwestarkansasmall.com","notes":""},
  {"name":"Park Plaza Mall","city":"Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"University Ave. & W. Markham St., Little Rock, AR 72205","phone":"","email":"","website":"http://www.parkplazamall.com","notes":""},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"5000 S Arizona Mills Cir, Tempe, AZ 85282","phone":"(480) 491-7300","email":"simon-5200@simon.com","website":"http://www.shopsimon.com","notes":""},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7700 W Arrowhead Towne Center, Glendale, AZ 85308","phone":"(623) 979-7720","email":"chaleena.harmon@macerich.com","website":"http://www.arrowheadtownecenter.com","notes":""},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"Chandler Blvd. & Price Frwy., Chandler, AZ 85226","phone":"","email":"lindsey.crooks@macerich.com","website":"http://www.westcor.com","notes":""},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"75th Ave. & Thomas Rd., Phoenix, AZ 85033","phone":"","email":"jose.barbosa@macerich.com","website":"http://www.desertskymall.com","notes":""},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7014 E Camelback Rd, Scottsdale, AZ 85251","phone":"(480) 990-7800","email":"eddie.sirmons@macerich.com","website":"http://www.fashionsquare.com","notes":""},
  {"name":"Superstition Springs Center","city":"Mesa","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 60 & Power Rd., Mesa, AZ 85206","phone":"","email":"jennifer.dennison@macerich.com","website":"http://www.westcor.com","notes":""},
  {"name":"Tucson Mall","city":"Tucson","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Oracle & Wetmore Rds., Tucson, AZ 85705","phone":"","email":"","website":"http://www.shoptucsonmall.com","notes":""},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"La Cienega, San Vicente, Beverly Blvd., Los Angeles, CA 90048","phone":"","email":"Simon-5600@simon.com","website":"http://www.beverlycenter.com","notes":""},
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1065 Brea Mall, Brea, CA 92821","phone":"(714) 990-2732","email":"simon-4821@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Centerpoint Mall","city":"Oxnard","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Saviers Rd. & Channel Islands Blvd., Oxnard, CA 93033","phone":"","email":"francesca.howard@jll.com","website":"http://www.centerpoint-mall.com","notes":""},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"US 101, Guerneville Rd., Cleveland Ave., Santa Rosa, CA 95401","phone":"","email":"coddingtown@codding.com","website":"http://www.coddingtownmall.com","notes":""},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3525 Carson St, Torrance, CA 90503","phone":"(310) 542-8525","email":"simon-5243@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Frwys. 2 & 134, Los Angeles, CA 90041","phone":"","email":"justin.lee2@cbre.com","website":"http://www.shopeaglerock.com","notes":""},
  {"name":"Fashion Square","city":"Sherman Oaks","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"14006 Riverside Drive, Sherman Oaks, CA 91423","phone":"(480) 990-7800","email":"fashionsquare@urw.com","website":"http://www.simon.com","notes":""},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7007 Friars Rd, San Diego, CA 92108","phone":"(619) 297-3381","email":"simon-4645@simon.com","website":"http://www.ggp.com","notes":""},
  {"name":"Ferry Building Marketplace","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":"galleriaatroseville@urw.com","website":"http://www.westfield.com/galleriaatroseville","notes":""},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"Broadway, Colorado, Columbus, Brand & Central, Glendale, CA 91210","phone":"","email":"","website":"http://www.glendalegalleria.com","notes":""},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"447 Great Mall Dr, Milpitas, CA 95035","phone":"","email":"simon-5250@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Hemet Valley Mall","city":"Hemet","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Florida Ave. @ Kirby & Gilmore St., Hemet, CA 92545","phone":"","email":"dweiss@mcstraussco.com","website":"http://www.thehemetvalleymall.com","notes":""},
  {"name":"Inland Center Mall","city":"San Bernardino","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Inland Center Dr. & I-215, San Bernardino, CA 92408","phone":"","email":"matthew.masoud@macerich.com","website":"http://www.macerich.com","notes":""},
  {"name":"Lakewood Center","city":"Lakewood","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Lakewood & Del Amo Blvds., Lakewood, CA 90712","phone":"","email":"","website":"http://www.shoplakewoodcenter.com","notes":""},
  {"name":"Los Cerritos Center","city":"Cerritos","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"605 Fwy. @ South St., Cerritos, CA 90703-5422","phone":"","email":"janet.cekander@macerich.com","website":"http://www.shoploscerritos.com","notes":""},
  {"name":"Merced Mall","city":"Merced","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Olive Ave. & R St., Merced, CA 95340","phone":"","email":"joey@ethanconradprop.com","website":"http://www.mercedmall.com","notes":""},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"pmiller@lpc.com","website":"","notes":""},
  {"name":"Moreno Valley Mall At Towngate","city":"Moreno Valley","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Day St. & Hwy. 60, Moreno Valley, CA 92553","phone":"","email":"","website":"http://www.morenovalleymall.com","notes":""},
  {"name":"Ontario Mills","city":"Ontario","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Interstates 10 & 15, Ontario, CA 91764","phone":"","email":"simon-5218@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Panorama Mall","city":"Panorama City","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Van Nuys Blvd. & Roscoe, Panorama City, CA 91402","phone":"","email":"","website":"http://www.panoramamall.com","notes":""},
  {"name":"Plaza Bonita","city":"National City","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-805 & Sweetwater Rd., National City, CA 91950","phone":"","email":"","website":"http://www.westfield.com/plazabonita","notes":""},
  {"name":"Puente Hills Mall","city":"City of Industry","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Azusa Ave. & Pomona Frwy., City of Industry, CA 91748","phone":"","email":"kmason@puentehillslv.com","website":"http://www.puentehills-mall.com","notes":""},
  {"name":"Santa Rosa Plaza","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 101 & 3rd St., Santa Rosa, CA 95401","phone":"","email":"simon-4837@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"South Bay Galleria","city":"Redondo Beach","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Artesia & Hawthorne Blvd., Redondo Beach, CA 90278","phone":"","email":"leasing@southbaysocialdistrict.com","website":"http://www.southbaygalleria.com","notes":""},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Bristol St. & 405 Frwy., Costa Mesa, CA 92626","phone":"","email":"info@southcoastplaza.com","website":"http://www.southcoastplaza.com","notes":""},
  {"name":"Stonewood Center","city":"Downey","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Firestone Blvd. & Lakewood Blvd., Downey, CA 90241","phone":"","email":"janet.cekander@macerich.com","website":"http://www.shopstonewoodcenter.com","notes":""},
  {"name":"The Oaks Shopping Center","city":"Thousand Oaks","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Lynn Rd., Hillcrest Dr., 101 Fwy, Thousand Oaks, CA 91360","phone":"","email":"","website":"http://www.shoptheoaksmall.com","notes":""},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-5 (San Diego Frwy). & Crown Valley Pkwy., Mission Viejo, CA 92691","phone":"","email":"simon-9180@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Valencia Town Center","city":"Valencia","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"24201 West Valencia Blvd., Valencia, CA 91355","phone":"","email":"","website":"","notes":""},
  {"name":"Victor Valley (The Mall of)","city":"Victorville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-15 & Bear Valley Rd., Victorville, CA 92392","phone":"","email":"matthew.masoud@macerich.com","website":"http://www.themallofvictorvalley.com","notes":""},
  {"name":"Vintage Faire Mall","city":"Modesto","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dale Rd. & Standiford Ave., Modesto, CA 95356","phone":"","email":"staci.maderos@macerich.com","website":"http://www.shopvintagefairemall.com","notes":""},
  {"name":"Westfield Century City","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"10250 Santa Monica Blvd., Los Angeles, CA 90067","phone":"","email":"centurycity.mgmt@urw.com","website":"","notes":""},
  {"name":"Westfield Culver City","city":"Culver City","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6000 Sepulveda Boulevard, Culver City, CA 90230","phone":"","email":"culvercity@westfield.com","website":"http://www.westfield.com/culvercity","notes":""},
  {"name":"Westfield Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":"","website":"http://www.westfield.com/galleriaatroseville","notes":"Refund form lists Massage Chairs US."},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6600 Topanga Canyon Boulevard, Canoga Park, CA 91303","phone":"","email":"topanga@westfield.com","website":"http://www.westfield.com/topanga","notes":""},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2855 Stevens Creek Blvd., Santa Clara, CA 95050","phone":"(408) 248-4450","email":"valleyfair@westfield.com","website":"http://www.westfield.com/valleyfair","notes":""},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3000 E 1st Avenue, Denver, CO 80206","phone":"(303) 388-3900","email":"Simon-5602@simon.com","website":"http://www.shopcherrycreek.com","notes":""},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"14500 W Colfax Ave, Lakewood, CO 80401","phone":"(303) 590-1634","email":"simon-5204@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"FlatIron Crossing","city":"Broomfield","state":"CO","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 36 @ Storage Tek/Interlocken Loop Exit, Broomfield, CO 80021","phone":"","email":"dana.peterson@macerich.com","website":"http://www.flatironcrossing.com","notes":""},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"I-25 @ County Line & C-470 @ Yosemite, Lone Tree, CO 80124","phone":"","email":"","website":"http://www.parkmeadows.com","notes":""},
  {"name":"Brass Mill Center","city":"Waterbury","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-84 & Route 8, Waterbury, CT 06706","phone":"","email":"","website":"http://www.brassmillcenter.com","notes":""},
  {"name":"Connecticut Post Mall","city":"Milford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-95 & Boston Post Rd. (U.S. Rte 1), Milford, CT 06460-2703","phone":"","email":"","website":"http://www.westfield.com/connecticutpost","notes":""},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7 Backus Ave, Danbury, CT 06810","phone":"(203) 743-3247","email":"","website":"http://www.danburyfairmall.com","notes":""},
  {"name":"Westfarms","city":"West Hartford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"New Britain Ave. @ South Rd., Farmington, CT 06032","phone":"","email":"Simon-5624@simon.com","website":"http://www.shopwestfarms.com","notes":""},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"132 Christiana Mall, Newark, DE 19702","phone":"(302) 731-9815","email":"","website":"http://www.shopchristianamall.com","notes":""},
  {"name":"Concord Mall","city":"Wilmington","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Naaman's Rd. & Concord Pike, Wilmington, DE 19803","phone":"","email":"","website":"","notes":""},
  {"name":"Dover Mall","city":"Dover","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"1365 N DuPont Hwy, Dover, DE 19901","phone":"(302) 678-4000","email":"","website":"http://www.dovermall.com","notes":""},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Biscayne Blvd. & 196th St., Aventura, FL 33180","phone":"","email":"leasing@turnberry.com","website":"http://www.aventuramall.com","notes":""},
  {"name":"Brandon Town Center","city":"Brandon","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"459 Brandon Town Center Drive, Brandon, FL 33511","phone":"","email":"","website":"","notes":""},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Broward Blvd. & University Dr., Plantation, FL 33324","phone":"","email":"","website":"http://www.westfield.com/broward","notes":""},
  {"name":"International Plaza","city":"Tampa","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Boy Scout Blvd. & West Shore Blvd., Tampa, FL 33607","phone":"","email":"Simon-5611@simon.com","website":"http://www.shopinternationalplaza.com","notes":""},
  {"name":"Miami International Mall","city":"Doral","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"NW 107th Ave. & SR 836, Doral, FL 33172","phone":"","email":"simon-9780@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Oviedo Mall","city":"Oviedo","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Red Bug Lake Rd. & Rte. 417, Oviedo, FL 32765","phone":"","email":"","website":"http://www.oviedomarketplace.com","notes":""},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"simon-5229@simon.com","website":"","notes":""},
  {"name":"Southland Mall - Cutler Bay","city":"Cutler Bay","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 1 & Caribbean Blvd., Miami, FL 33189","phone":"","email":"","website":"http://www.mysouthlandmall.com","notes":""},
  {"name":"The Mall at Millenia","city":"Orlando","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-4 & Conroy Road, 1 Mile E of Universal Studio, Orlando, FL 32839","phone":"","email":"","website":"http://www.mallatmillenia.com","notes":""},
  {"name":"University Mall - Tampa","city":"Tampa","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"2200 E Fowler Ave, Tampa, FL 33612","phone":"","email":"","website":"","notes":""},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Peachtree St. NE & Lenox Rd., Atlanta, GA 30326","phone":"","email":"simon-4827@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-85 & S.R. 20, Buford, GA 30519","phone":"","email":"simon-4852@simon.com","website":"http://www.mallofgeorgia.com","notes":""},
  {"name":"North Point Mall","city":"Alpharetta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Georgia 400 & Haynes Bridge Rd., Alpharetta, GA 30022","phone":"","email":"","website":"http://www.northpointmall.com","notes":""},
  {"name":"Perimeter Mall","city":"Dunwoody","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hammond Dr. & Perimeter Center Wesst, Atlanta, GA 30346","phone":"","email":"","website":"http://www.perimetermall.com","notes":""},
  {"name":"Ponce City Market","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Jamestown","operatedBy":"Jamestown","address":"","phone":"","email":"SpecialtyLeasing@JamestownLP.com","website":"","notes":""},
  {"name":"Southlake Mall - Morrow","city":"Morrow","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Jonesboro Road & I-75 South, Morrow, GA 30260","phone":"","email":"","website":"http://www.shopsouthlakemall.com","notes":""},
  {"name":"Sugarloaf Mills Mall","city":"Lawrenceville","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"5900 Sugarloaf Pkwy, Lawrenceville, GA 30043","phone":"","email":"","website":"","notes":""},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1450 Ala Moana Blvd, Honolulu, HI 96814","phone":"(808) 955-9517","email":"","website":"","notes":""},
  {"name":"Kahala Mall","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Waialae Ave. @ Hunakai & Kilauea, Honolulu, HI 96816-5319","phone":"","email":"","website":"http://www.kahalamallcenter.com","notes":""},
  {"name":"Pearlridge Center","city":"Aiea","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Moanalua Rd., Kamehameha Hwy., Aiea, HI 96701","phone":"","email":"","website":"http://www.pearlridgeonline.com","notes":""},
  {"name":"Coral Ridge Mall","city":"Coralville","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-80, U.S.Hwy. 965 & U.S.Hwy. 6, Coralville, IA 52241","phone":"","email":"","website":"http://www.coralridgemall.com","notes":""},
  {"name":"Jordan Creek Town Center","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Jordan Creek Pkwy (old 74th St.) & Mills Civic Pky, West Des Moines, IA 50266","phone":"","email":"","website":"http://www.jordancreektowncenter.com","notes":""},
  {"name":"NorthPark Mall - Davenport","city":"Davenport","state":"IA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 61 & Kimberly Rd., Davenport, IA 52806","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Valley West Mall","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Boise Towne Square","city":"Boise","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Milwaukee St. & Franklin Rd., Boise, ID 83704","phone":"","email":"","website":"http://www.boisetownsquare.com","notes":""},
  {"name":"Grand Teton Mall","city":"Idaho Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"17th St. & Hitt Rd, Idaho Falls, ID 83404","phone":"","email":"","website":"http://www.grandtentonmall.com","notes":""},
  {"name":"Magic Valley Mall","city":"Twin Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Blue Lakes Blvd. & Pole Line Rd., Twin Falls, ID 83301","phone":"","email":"info@magicvalleymall.com","website":"http://www.magicvalleymall.com","notes":""},
  {"name":"Chicago Premium Outlets","city":"Aurora","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1650 Premium Outlet Blvd, Aurora, IL 60502","phone":"(630) 692-1451","email":"","website":"http://www.theplazamall.org","notes":""},
  {"name":"Fashion Outlets of Chicago","city":"Rosemont","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-294 @ Balmoral Ave., Rosemont, IL 60018","phone":"","email":"","website":"http://www.awetalisman.com","notes":""},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-94 & Grand Ave. (IL 132), Gurnee, IL 60031","phone":"","email":"simon-5216@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"100 Oakbrook Center, Oak Brook, IL 60523","phone":"(630) 573-0700","email":"","website":"http://www.theplazamall.org","notes":""},
  {"name":"Orland Square Shopping Center","city":"Orland Park","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"151st St. & LaGrange Rd. (Rt.45), Orland Park, IL 60462","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Water Tower Place","city":"Chicago","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Michigan Ave. @ Pearson & Chestnut, Chicago, IL 60611","phone":"","email":"","website":"http://www.shopwatertower.com","notes":""},
  {"name":"Westfield Old Orchard","city":"Skokie","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"4905 Old Orchard Center, Skokie, IL 60077","phone":"","email":"oldorchard@westfield.com","website":"http://www.theplazamall.org","notes":""},
  {"name":"White Oaks Mall","city":"Springfield","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 36 & Hwy. 68 Bypass/NE, Springfield, IL 62704","phone":"","email":"simon-4536@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Woodfield Dr. SW of I-90 & IL 53, Schaumburg, IL 60173","phone":"","email":"","website":"http://www.shopwoodfield.com","notes":""},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"6020 E 82nd St, Indianapolis, IN 46250","phone":"(317) 849-9994","email":"simon-8700@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2894 E 3rd St, Bloomington, IN 47401","phone":"(812) 339-9370","email":"simon-0540@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Hwy 66 & Green River Road, Evansville, IN 47715","phone":"","email":"lezlie.hohl@macerich.com","website":"http://www.simon.com","notes":""},
  {"name":"Fashion Mall at Keystone","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"E. 86th St. & Keystone Ave., Indianapolis, IN 46240","phone":"","email":"simon-2111@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US 31 & County Line Rd. SE., Greenwood, IN 46142","phone":"","email":"simon-1325@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Lighthouse Place Premium Outlets","city":"Michigan City","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"601 Wabash St, Michigan City, IN 46360","phone":"","email":"simon-7867@simon.com","website":"","notes":""},
  {"name":"Tippecanoe Mall","city":"Lafayette","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 52 & SR 38, Lafayette, IN 47905","phone":"","email":"simon-2307@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"University Park Mall","city":"Mishawaka","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR 23 & Grape Road, Mishawaka, IN 46545","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Oak Park Mall","city":"Overland Park","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"95th & Quivira Rd., Overland Park, KS 66214","phone":"","email":"","website":"http://www.thenewoakparkmall.com","notes":""},
  {"name":"Town Center Plaza","city":"Leawood","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kellogg Dr. & Rock Rd., Wichita, KS 67207","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Towne East Square","city":"Wichita","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kellogg Dr. & Rock Rd., Wichita, KS 67207","phone":"","email":"simon-2105@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"West Ridge Mall","city":"Topeka","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"21st & Wanamaker, Topeka, KS 66604","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Fayette Mall","city":"Lexington","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Reynolds & Nicholasville Rds., Lexington, KY 40503-3693","phone":"","email":"","website":"http://www.shopfayette-mall.com","notes":""},
  {"name":"Mall St. Matthews","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Shelbyville Rd. & Bowling Blvd., Louisville, KY 40207","phone":"","email":"","website":"http://www.ggp.com","notes":""},
  {"name":"Oxmoor Center","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-264 & Shelbyville Rd. , Louisville, KY 40222","phone":"","email":"","website":"http://www.oxmoorcenter.com","notes":""},
  {"name":"Lakeside Shopping Center","city":"Metairie","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"N. Causeway Blvd. & Severn Avenue, Metairie, LA 70002","phone":"","email":"","website":"http://www.lakesideshopping.com","notes":""},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"6401 Bluebonnet Blvd, Baton Rouge, LA 70836","phone":"(225) 761-7220","email":"","website":"http://www.mallofla.com","notes":""},
  {"name":"Prien Lake Mall","city":"Lake Charles","state":"LA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Prien Lake Rd. & Ernest St., Lake Charles, LA 70601","phone":"","email":"simon-2318@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"The Esplanade","city":"Kenner","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"75 Middlesex Turnpike, Burlington, MA 01803","phone":"(781) 272-8668","email":"simon-4822@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"CambridgeSide","city":"Cambridge","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"CambridgeSide Place & Edwin Land Blvd., Cambridge, MA 02141","phone":"","email":"","website":"http://www.shopcambridgeside.com","notes":""},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1245 Worcester St, Natick, MA 01760","phone":"(508) 655-4800","email":"","website":"http://www.natickmall.com","notes":""},
  {"name":"Northshore Mall","city":"Peabody","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rts. 128 N & 114 E, Peabody, MA 01960","phone":"","email":"simon-4923@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Quincy Market","city":"Boston","state":"MA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"South Shore Plaza","city":"Braintree","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Granite St. & Rts. 37 & 128, Braintree, MA 02184","phone":"","email":"simon-4838@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7000 Arundel Mills Cir, Hanover, MD 21076","phone":"(410) 540-5110","email":"simon-5201@simon.com","website":"","notes":""},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"10300 Little Patuxent Pkwy, Columbia, MD 21044","phone":"(410) 730-3300","email":"","website":"http://www.themallincolumbia.com","notes":""},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"825 Dulaney Valley Rd, Towson, MD 21204","phone":"(410) 825-3535","email":"","website":"http://www.towsontowncenter.com","notes":""},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"7101 Democracy Boulevard, Bethesda, MD 20817","phone":"(301) 469-6000","email":"montgomery@urw.com","website":"http://www.westfield.com/montgomery","notes":""},
  {"name":"Bangor Mall","city":"Bangor","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rt. 95, Hogan Rd., & Stillwater Ave., Bangor, ME 04401","phone":"","email":"","website":"http://www.bangormall.com","notes":""},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"Maine Mall & Gorham Rds., South Portland, ME 04106-3206","phone":"","email":"","website":"http://www.ggp.com","notes":""},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"100 Briarwood Cir, Ann Arbor, MI 48108","phone":"(734) 769-9610","email":"simon-5240@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Great Lakes Crossing","city":"Auburn Hills","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"4000 Baldwin Road, Auburn Hills, MI 48326","phone":"(248) 454-5010","email":"Simon-5609@simon.com","website":"http://www.shopgreatlakescrossing.com","notes":""},
  {"name":"Somerset Collection","city":"Troy","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"W. Big Beaver Rd. @ Coolidge, Troy, MI 48084","phone":"","email":"","website":"http://www.thesomersetcollection.com","notes":""},
  {"name":"Twelve Oaks Mall","city":"Novi","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Novi & Twelve Mile Rds., Novi, MI 48377","phone":"","email":"","website":"http://www.shoptwelveoaks.com","notes":""},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"Cedar Ave. (Hwy. 77) & E. 81st St. SE., Bloomington, MN 55425","phone":"","email":"info@mallofamerica.com","website":"http://www.mallofamerica.com","notes":""},
  {"name":"Ridgedale Center","city":"Minnetonka","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-394 & Ridgedale Dr., Minnetonka, MN 55305","phone":"","email":"","website":"http://www.ridgedalecenter.com","notes":""},
  {"name":"Rosedale Center","city":"Roseville","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Country Road B2 between Snelling and Fairview, Roseville, MN 55113","phone":"","email":"","website":"http://www.myrosedale.com","notes":""},
  {"name":"Southdale Center","city":"Edina","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"West 66th & 69th Sts. & France Ave. South, Edina, MN 55435","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Southdale Shopping Center - Edina","city":"Edina","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"France Ave. & 69th St., Edina, MN 55435","phone":"","email":"","website":"http://www.galleriaedina.com","notes":""},
  {"name":"Twin Cities Premium Outlets","city":"Eagan","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"France Ave. & 69th St., Edina, MN 55435","phone":"","email":"simon-8056@simon.com","website":"http://www.galleriaedina.com","notes":""},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2825 S Glenstone Ave, Springfield, MO 65804","phone":"(417) 883-4111","email":"simon-0302@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Independence Center","city":"Independence","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-70 & M291 @ 39th St., Independence, MO 64057","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Saint Louis Galleria","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-64/40 & I-170, St. Louis, MO 63117","phone":"","email":"","website":"http://www.saintlouisgalleria.com","notes":""},
  {"name":"West County Center","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Manchester & I-270, Des Peres, MO 63131","phone":"","email":"","website":"http://www.shopwestcountycenter.com","notes":""},
  {"name":"Edgewater Mall","city":"Biloxi","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Beach Blvd. (Hwy 90) & Eisenhower Dr., Biloxi, MS 39531","phone":"","email":"","website":"http://www.edgewatermall.com","notes":""},
  {"name":"Mall at Barnes Crossing","city":"Tupelo","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy 45, Hwy 78 & Barnes Crossing Rd., Tupelo, MS 38804","phone":"","email":"tim.gilmore@jll.com","website":"http://www.barnescrossing.com","notes":""},
  {"name":"Northpark Mall","city":"Ridgeland","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Wheatley & County Line Rds., Ridgeland, MS 39157","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Holiday Village Mall","city":"Great Falls","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"9th & 10th Ave. South, Great Falls, MT 59405","phone":"","email":"evan@gk-re.com","website":"http://www.holidayvillagemall.com","notes":""},
  {"name":"Rimrock Mall","city":"Billings","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Central & S. 24th St. West, Billings, MT 59102","phone":"","email":"","website":"http://www.rimrockmall.com","notes":""},
  {"name":"Southgate Mall","city":"Missoula","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 93 & South Ave., Missoula, MT 59801","phone":"","email":"","website":"http://www.shopsouthgate.com","notes":""},
  {"name":"Concord Mills","city":"Concord","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"8111 Concord Mills Blvd, Concord, NC 28027","phone":"(704) 979-0001","email":"simon-5207@simon.com","website":"","notes":""},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"CBL & Associates","operatedBy":"CBL & Associates","address":"US 70 (Glenwood Ave.) & Raleigh Beltline (I-440), Raleigh, NC 27612","phone":"","email":"","website":"http://www.crabtree-valley-mall.com","notes":""},
  {"name":"Hanes Mall","city":"Winston-Salem","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 @ Hanes Mall Blvd., Winston-Salem, NC 27103","phone":"","email":"","website":"http://www.shophanesmall.com","notes":""},
  {"name":"SouthPark","city":"Charlotte","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Sharon & Fairview Rds., Charlotte, NC 28211","phone":"","email":"simon-7605@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"The Streets at Southpoint","city":"Durham","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Kirkwood Mall","city":"Bismarck","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"7th St. & Bismarck Expwy., Bismarck, ND 58504","phone":"","email":"","website":"http://www.shopkirkwoodmall.com","notes":""},
  {"name":"West Acres Shopping Center","city":"Fargo","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-29 & 13th Ave. South, Fargo, ND 58103","phone":"","email":"","website":"http://www.westacres.com","notes":""},
  {"name":"Gateway Mall","city":"Lincoln","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"61st & O St., Lincoln, NE 68505","phone":"","email":"","website":"http://www.westfield.com/gateway","notes":""},
  {"name":"Westroads Mall","city":"Omaha","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dodge St. & I-680, Omaha, NE 68114","phone":"","email":"","website":"http://www.westroadsmall.com","notes":""},
  {"name":"Pheasant Lane Mall","city":"Nashua","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Daniel Webster Hwy. & Rt. 3, Nashua, NH 03060","phone":"","email":"simon-7604@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"The Mall at Rockingham Park","city":"Salem","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rte. 93 & Rockingham Park Blvd., Salem, NH 03079","phone":"","email":"simon-4926@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"The Mall of New Hampshire","city":"Manchester","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-293 & S. Willow St. (Rt. 28), Manchester, NH 03103","phone":"","email":"simon-4927@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"1 American Dream Way, East Rutherford, NJ 07073","phone":"","email":"","website":"https://www.americandream.com/directory/shopping","notes":""},
  {"name":"Cherry Hill Mall","city":"Cherry Hill","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rt. 38 & Haddonfield Rd., Cherry Hill, NJ 08002","phone":"","email":"","website":"http://www.cherryhillmall.com","notes":""},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1750 Deptford Center Rd, Deptford, NJ 08096","phone":"(856) 848-0400","email":"tracy.ficara@macerich.com","website":"http://www.deptfordmall.com","notes":""},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"3710 US-9, Freehold, NJ 07728","phone":"(732) 577-1144","email":"kevin.averell@macerich.com","website":"http://www.freeholdracewaymall.com","notes":""},
  {"name":"Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":"","website":"http://www.westfield.com/gardenstateplaza","notes":""},
  {"name":"The Mills at Jersey Gardens","city":"Elizabeth","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Exit 13 A,New Jersey Turnpike, Elizabeth, NJ 07201","phone":"","email":"simon-5343@simon.com","website":"http://www.jerseygardens.com","notes":""},
  {"name":"Westfield Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":"gardenstateplaza@westfield.com","website":"http://www.westfield.com/gardenstateplaza","notes":""},
  {"name":"ABQ Uptown","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"simon-5350@simon.com","website":"","notes":""},
  {"name":"Coronado Center","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Louisiana & Menaul Blvd., Albuquerque, NM 87110","phone":"","email":"","website":"http://www.coronadocenter.com","notes":""},
  {"name":"Cottonwood Mall","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Coors Bypass/NW & 7 Bar Loop Rd./SE, Albuquerque, NM 87114","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Rio West Mall","city":"Gallup","state":"NM","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 & US Hwy. 666, Gallup, NM 87301","phone":"","email":"","website":"http://www.riowestmall.com","notes":""},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Maryland Pkwy. btwn. Desert Inn Rd. & Twain, Las Vegas, NV 89169","phone":"","email":"","website":"http://www.blvdmall.com","notes":""},
  {"name":"Fashion Show","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Las Vegas Blvd. & Spring Mountain Rd., Las Vegas, NV 89109","phone":"","email":"","website":"http://www.thefashionshow.com","notes":""},
  {"name":"Galleria at Sunset","city":"Henderson","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Stephanie St. & Sunset Rd., Henderson, NV 89014","phone":"","email":"sunsetmalloffice@spinosoreg.com","website":"http://www.galleriaatsunset.com","notes":""},
  {"name":"Meadows Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 95 & Valley View Blvd., Las Vegas, NV 89107","phone":"","email":"","website":"http://www.meadowsmall.com","notes":""},
  {"name":"Chelsea Market","city":"New York","state":"NY","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Crossgates Mall","city":"Albany","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-87 & I-90, Albany, NY 12203","phone":"","email":"","website":"http://www.shopcrossgates.com","notes":""},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Pyramid Management","operatedBy":"Pyramid Management","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Fashion Outlets - Niagara Falls","city":"Niagara Falls","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Niagara Falls Blvd. & Military Rd., Niagara Falls, NY 14304","phone":"","email":"","website":"http://www.fashionoutletsniagara.com","notes":""},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"2034 Green Acres Mall, Valley Stream, NY 11581","phone":"(516) 561-1157","email":"","website":"http://www.greenacresmallonline.com","notes":""},
  {"name":"Kings Plaza Shopping Center","city":"Brooklyn","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Flatbush Ave. & Ave. U, Brooklyn, NY 11234","phone":"","email":"matt.bragin@macerich.com","website":"http://www.kingsplazaonline.com","notes":""},
  {"name":"Queens Center","city":"Elmhurst","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Queens Blvd. @ Woodhaven Blvd. & L.I.E., Elmhurst, NY 11373","phone":"","email":"seline.german@macerich.com","website":"http://www.shopqueenscenter.com","notes":""},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Old Country Rd. & Meadowbrook, Garden City, NY 11530","phone":"","email":"simon-4836@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Wilton Mall at Saratoga","city":"Saratoga Springs","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Weibel Ave. & Rt. 50, Saratoga Springs, NY 12866","phone":"","email":"","website":"http://www.wiltonmall.com","notes":""},
  {"name":"Cincinnati Premium Outlets","city":"Monroe","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-275 @ Winton Rd., Cincinnati, OH 45240","phone":"","email":"simon-7924@simon.com","website":"http://www.blueridgecapital.com","notes":""},
  {"name":"Eastgate Mall","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-275 & State Rts. 32 & 74, Cincinnati, OH 45245","phone":"","email":"","website":"http://www.shopeastgate-mall.com","notes":""},
  {"name":"Easton Town Center","city":"Columbus","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Eastwood Mall Complex","city":"Niles","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR 46 & US Rt. 422, Niles, OH 44446-4897","phone":"","email":"","website":"http://www.eastwoodmall.com","notes":""},
  {"name":"Findlay Market","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"info@findlaymarket.org","website":"","notes":""},
  {"name":"Kenwood Towne Centre","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kenwood, Montgomery, & Galbraith Rds., Cincinnati, OH 45236","phone":"","email":"","website":"http://www.kenwoodtownecenter.com","notes":""},
  {"name":"SouthPark Mall","city":"Strongsville","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-71 @ Route 82, Strongsville, OH 44136","phone":"","email":"","website":"http://www.westfield.com/southpark","notes":""},
  {"name":"Summit Mall","city":"Fairlawn","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR. 18 & Ghent Rd., Akron, OH 44333","phone":"","email":"simon-9570@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Tuttle Crossing (The Mall at)","city":"Dublin","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-270 & Tuttle Crossing Interchange, Dublin, OH 43016","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"West Side Market","city":"Cleveland","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"info@westsidemarket.org","website":"","notes":""},
  {"name":"Penn Square Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Northwest Expwy. & N. Pennsylvania Ave., Oklahoma City, OK 73118","phone":"","email":"simon-7603@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Quail Springs Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Memorial Rd. btwn. May & Penn Aves., Oklahoma City, OK 73134","phone":"","email":"","website":"http://www.quailspringsmall.com","notes":""},
  {"name":"Woodland Hills Mall","city":"Tulsa","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"S. Memorial Dr. & 71st St., Tulsa, OK 74133","phone":"","email":"simon-7607@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Clackamas Town Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Fubonn Shopping Center","city":"Portland","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"2850 SE 82nd Ave, Portland, OR 97266","phone":"","email":"","website":"","notes":""},
  {"name":"Lloyd Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Valley River Center","city":"Eugene","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Valley River Drive & Delta Hwy., Eugene, OR 97401","phone":"","email":"","website":"http://www.valleyrivercenter.com","notes":""},
  {"name":"Washington Square","city":"Tigard","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 217 & Greenburg Rd., Tigard, OR 97223","phone":"","email":"miranda.moe@macerich.com","website":"http://www.shopwashingtonsquare.com","notes":""},
  {"name":"Franklin Mills, PA (FKA Philadelphia Mills)","city":"Philadelphia","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Woodhaven & Knights Rds., Philadelphia, PA 19154","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Grove City Premium Outlets","city":"Grove City","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"1911 Leesburg Grove City Rd, Grove City, PA 16127","phone":"","email":"simon-7967@simon.com","website":"","notes":""},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rts. 202 & Schuykill Expwy., King of Prussia, PA 19406","phone":"","email":"","website":"http://www.kingofprussiamall.com","notes":""},
  {"name":"Millcreek Mall","city":"Erie","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Interchange Rd. & Peachstreet (I79, Exit 180), Erie, PA 16565","phone":"","email":"","website":"http://www.millcreekmall.net","notes":""},
  {"name":"Reading Terminal Market","city":"Philadelphia","state":"PA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"m-mooney@readingterminalmarket.org","website":"","notes":""},
  {"name":"Ross Park Mall","city":"Pittsburgh","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"McKnight Rd. & Siebert Rd. N/E, Pittsburgh, PA 15237","phone":"","email":"simon-3107@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"The Mall at Robinson","city":"Robinson Township","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-376 & Robinson Town Centre Blvd., Robinson, PA 15205","phone":"","email":"","website":"http://www.shoprobinsonmall.com","notes":""},
  {"name":"Willow Grove Park","city":"Willow Grove","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Moreland, Easton, Old Welsh, Willow Grove, PA 19090","phone":"","email":"","website":"http://www.willowgroveparkmall.com","notes":""},
  {"name":"Providence Place","city":"Providence","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Francis St., I-95 & Memorial Blvd., Providence, RI 02903","phone":"","email":"","website":"http://www.providenceplace.com","notes":""},
  {"name":"Warwick Mall","city":"Warwick","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rts. 2 & 5, Warwick, RI 02886","phone":"","email":"","website":"http://www.warwickmall.com","notes":""},
  {"name":"Coastal Grand Mall","city":"Myrtle Beach","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Highway 17 By-Pass & Highway 501, Myrtle Beach, SC 29577","phone":"","email":"","website":"http://www.coastalgrand.com","notes":""},
  {"name":"Columbiana Centre","city":"Columbia","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-26 & Harbison Blvd., Columbia, SC 29212","phone":"","email":"","website":"http://www.columbianacentre.com","notes":""},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-385 N. & Haywood Rd., Greenville, SC 29607","phone":"","email":"simon-4825@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Louise Ave & 41st St., Sioux Falls, SD 57106-6523","phone":"","email":"","website":"http://www.theempiremall.com","notes":""},
  {"name":"Rushmore Mall","city":"Rapid City","state":"SD","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"LaCrosse St. & Haines Ave., Rapid City, SD 57701","phone":"","email":"","website":"http://www.rushmoremall.com","notes":""},
  {"name":"Assembly Food Hall","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"hello@assemblyfoodhall.com","website":"","notes":""},
  {"name":"CoolSprings Galleria","city":"Franklin","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-65 & Galleria Blvd., Franklin, TN 37067","phone":"","email":"","website":"http://www.coolspringsgalleria.com","notes":""},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Two Rivers Pkwy. & McGavock Pike, Nashville, TN 37214","phone":"","email":"simon-5221@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Stones River Mall","city":"Murfreesboro","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 96, Old Fort Pkwy. & I-24, Murfreesboro, TN 37129","phone":"","email":"","website":"http://www.stonesrivermall.com","notes":""},
  {"name":"West Town Mall","city":"Knoxville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kingston Pike & Montvue Rd., Knoxville, TN 37919","phone":"","email":"simon-9805@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Wolfchase Galleria","city":"Memphis","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 & Germantown Pkwy., Memphis, TN 38133","phone":"","email":"simon-7606@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Gulf Frwy. @ Almeda Genoa, Houston, TX 77075","phone":"","email":"","website":"http://www.almedamall.com","notes":""},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2901 S Capital of Texas Hwy, Austin, TX 78746","phone":"(512) 327-7041","email":"simon-0145@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"4601 S Broadway Ave, Tyler, TX 75703","phone":"(903) 561-7055","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"8401 Gateway Blvd W, El Paso, TX 79925","phone":"(915) 779-7071","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Grapevine Mills","city":"Grapevine","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3000 Grapevine Mills Pkwy, Grapevine, TX 76051","phone":"(972) 724-4910","email":"simon-5211@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Post Oak Blvd. & Westheimer Rd., Houston, TX 77056","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Houston Premium Outlets","city":"Cypress","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Post Oak Blvd. & Westheimer Rd., Houston, TX 77056","phone":"","email":"simon-7909@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Katy Mills","city":"Katy","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-10 & Pin Oak Road, Katy, TX 77494","phone":"","email":"simon-5217@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"La Plaza Mall","city":"McAllen","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"South 10th St. & Wichita Ave. NW., McAllen, TX 78503","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Lakeline Mall","city":"Cedar Park","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 183 & R.R. 620/NW, Cedar Park, TX 78613","phone":"","email":"simon-2324@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Memorial City Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Gessner Rd. & I-10 (Katy Fwy), Houston, TX 77024","phone":"","email":"","website":"http://www.memorialcitymall.com","notes":""},
  {"name":"Midland Park Mall","city":"Midland","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 250 & Midkiff Rd./SW, Midland, TX 79705","phone":"","email":"simon-2580@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Music City Mall - Odessa TX","city":"Odessa","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"42nd St. & JBS Pkwy. & Tanglewood Blvd., Odessa, TX 79762","phone":"","email":"","website":"http://www.musiccitymall.net","notes":""},
  {"name":"North East Mall - Hurst","city":"Hurst","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 820 & Bedford Euless Rd., Hurst, TX 76053","phone":"","email":"simon-1540@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"North Star Mall","city":"San Antonio","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 410 & San Pedro Ave., San Antonio, TX 78216","phone":"","email":"","website":"http://www.northstarmall.com","notes":""},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"North Central Expwy. & Northwest Hwy.(Loop 12), Dallas, TX 75225","phone":"","email":"","website":"http://www.northparkcenter.com","notes":""},
  {"name":"Rivercenter","city":"San Antonio","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"849 E Commerce St, San Antonio, TX 78205","phone":"","email":"","website":"","notes":""},
  {"name":"San Marcos Premium Outlets","city":"San Marcos","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3939 S Interstate 35, San Marcos, TX 78666","phone":"","email":"simon-7982@simon.com","website":"","notes":""},
  {"name":"South Plains Mall - Lubbock","city":"Lubbock","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"South 10th St. & Wichita Ave. NW., McAllen, TX 78503","phone":"","email":"megan.renfro@macerich.com","website":"http://www.simon.com","notes":""},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Gulf Frwy. @ Almeda Genoa, Houston, TX 77075","phone":"","email":"","website":"http://www.almedamall.com","notes":"Address and URL identify this as Almeda Mall. Refund form lists Massage Chairs US."},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Fashion Place","city":"Murray","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"State St.& Winchester, Murray, UT 84107","phone":"","email":"","website":"http://www.fashionplace.com","notes":""},
  {"name":"University Place","city":"Orem","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"State St. & University Pkwy., Orem, UT 84097","phone":"","email":"","website":"http://www.shopuniversitymall.com","notes":""},
  {"name":"Valley Fair Mall","city":"West Valley City","state":"UT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3500 South & 2700 West, West Valley City, UT 84119","phone":"","email":"","website":"http://www.shopvalleyfairmall.com","notes":""},
  {"name":"MacArthur Center","city":"Norfolk","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"simon-5227@simon.com","website":"","notes":""},
  {"name":"Short Pump Town Center","city":"Richmond","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"Spotsylvania Towne Centre","city":"Fredericksburg","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-95 & Rt. 3, Fredericksburg, VA 22407","phone":"","email":"","website":"http://www.spotsylvaniamall.com","notes":""},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1961 Chain Bridge Rd, Tysons, VA 22102","phone":"(703) 893-9401","email":"","website":"http://www.shoptysons.com","notes":""},
  {"name":"University Mall","city":"South Burlington","state":"VT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dorset St. @ Williston Rd., South Burlington, VT 05403","phone":"","email":"","website":"http://www.umallvt.com","notes":""},
  {"name":"Alderwood","city":"Lynnwood","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Alderwood Mall Blvd. & 184th St. SW, Lynnwood, WA 98037","phone":"","email":"","website":"http://www.alderwoodmall.com","notes":""},
  {"name":"Bellevue Square","city":"Bellevue","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Bellevue Way, NE 8th & 4th Sts., 100th Ave., Bellevue, WA 98004","phone":"","email":"","website":"http://www.bellevuecollection.com","notes":""},
  {"name":"Northgate","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-5 & NE Northgate Way, Seattle, WA 98125","phone":"","email":"simon-9250@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Pike Place Market","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"commercialleasing@pikeplacemarket.org","website":"","notes":""},
  {"name":"South Hill Mall - Puyallup","city":"Puyallup","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rts. 161 & 512, Puyallup, WA 98373","phone":"","email":"propertymanager@southhillmall.com","website":"http://www.southhillmall.com","notes":""},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":"","website":"http://www.westfield.com/southcenter","notes":""},
  {"name":"Tacoma Mall","city":"Tacoma","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-5 & Tacoma Mall Blvd., Tacoma, WA 98409","phone":"","email":"simon-9600@simon.com","website":"http://www.simon.com","notes":""},
  {"name":"Wenatchee Valley Mall","city":"East Wenatchee","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"5th & Valley Mall Pkwy., E. Wenatchee, WA 98802","phone":"","email":"","website":"http://www.wenatcheevalleymall.com","notes":""},
  {"name":"Bayshore","city":"Glendale","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":""},
  {"name":"East Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Eagan Rd. & E. Washington Ave., Madison, WI 53704","phone":"","email":"","website":"http://www.shopeasttowne-mall.com","notes":""},
  {"name":"Mayfair Mall","city":"Wauwatosa","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Mayfair Rd. (Hwy 100) & North Ave., Wauwatosa, WI 53226","phone":"","email":"","website":"http://www.mayfairmall.com","notes":""},
  {"name":"Miller Hill Mall","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":"","notes":"Venue is in Duluth, MN. Refund form lists Massage Chairs US."},
  {"name":"Southridge Mall - Greendale","city":"Greendale","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"S. 76th St. South of I-894, Greendale, WI 53129","phone":"","email":"","website":"http://www.simon.com","notes":""},
  {"name":"Charleston Town Center","city":"Charleston","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Court,Clendenin,Quarrier & Lee Sts., Charleston, WV 25389","phone":"","email":"","website":"http://www.charlestontowncenter.com","notes":""},
  {"name":"Huntington Mall","city":"Barboursville","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"IR 64 & Mall Rd., Barboursville, WV 25504","phone":"","email":"","website":"http://www.huntington-mall.com","notes":""},
  {"name":"Eastridge Mall","city":"Casper","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Wyoming Blvd. & East Second St., Casper, WY 82609","phone":"","email":"","website":"http://www.shopeastridge.com","notes":""},
  {"name":"Frontier Mall","city":"Cheyenne","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Powderhouse Rd. & Dell Range Blvd., Cheyenne, WY 82009","phone":"","email":"","website":"http://www.frontiermall.com","notes":""},
  {"name":"Westfield Mainplace","city":"Ana","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Santa Ana & Garden Grove Frwys.& Main St., Santa Ana, CA 92705-6615","phone":"","email":"fvalle@centennialrec.com","website":"https://www.shopmainplacemall.com/information","notes":""},
  {"name":"Mesa Mall","city":"Junction","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Hwys. 6 & 50, 24 Rd., Grand Junction, CO 81505","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Coral Square","city":"Springs","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Atlantic Blvd. & University Dr., Coral Springs, FL 33071","phone":"","email":"simon-9862@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Cordova Mall","city":"Pensacola","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"N. 9th Ave. & Bayou Blvd., Pensacola, FL 32504","phone":"","email":"simon-0552@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Dadeland Mall","city":"Miami","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"N. Kendall Dr.(SR 94) & SR 826, Miami, FL 33156","phone":"","email":"simon-0735@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Dolphin Mall","city":"Miami","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Florida Turnpike & SR 836, Miami, FL 33172","phone":"","email":"Simon-5607@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Paddock Mall","city":"Ocala","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"SR 200 & I-75, Ocala, FL 34474","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Volusia Mall","city":"Beach","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Bill France Blvd. & International Speedway Blvd., Daytona Beach, FL 32114","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":"CBL loan modified, maturity extended to Jan 2027. Financing risk."},
  {"name":"Arbor Place","city":"Douglasville","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Chapel Hill Rd.@ Douglas Blvd. & I-20, Douglasville, GA 30135","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":"CBL in lender discussions on $81.6M loan. High occupancy but financing risk."},
  {"name":"Phipps Plaza","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Peachtree Rd. NE & Lenox Rd., Atlanta, GA 30326","phone":"","email":"simon-4834@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Prince Kuhio Plaza","city":"Hilo","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 11 & E. Puainako St., Hilo, HI 96720","phone":"","email":"","website":"https://www.princekuhioplaza.com/en/directory/","notes":""},
  {"name":"CherryVale Mall","city":"Rockford","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Perryville Rd. & Harrison Ave., Rockford, IL 61112","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Eastland Mall","city":"Bloomington","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"E. Empire St. (Rt. 9) & N. Veteran's Pkwy. (US 55), Bloomington, IL 61701","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":"CBL under contract to sell for $11.3M. Sale pending."},
  {"name":"Francis Scott Key Mall","city":"Frederick","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"I-270 & Rt. 85 & Buckeystown Pike, Frederick, MD 21703","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"The Mall At Prince Georges","city":"Hyattsville","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"East West Hwy. & Belcrest Rd., Hyattsville, MD 20782","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Valley Mall","city":"Hagerstown","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Halfway & Massey Blvds., Hagerstown, MD 21740","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Auburn Mall","city":"Auburn","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-290 & I-90, Auburn, MA 01501","phone":"","email":"simon-4918@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Cape Cod Mall","city":"Hyannis","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rts. 132 & 28, Hyannis, MA 02601","phone":"","email":"simon-4919@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Dartmouth Mall","city":"Dartmouth","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"NWC Rt. 6 & Faunce off I-195, Dartmouth, MA 02747","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Liberty Tree Mall","city":"Danvers","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Endicott St. & Rt. 128, Danvers, MA 01923","phone":"","email":"simon-4922@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Square One Mall","city":"Saugus","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rt. 1 & Main St., Saugus, MA 01906","phone":"","email":"simon-4925@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Laurel Park Place","city":"Livonia","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Six Mile & Newburgh Rds., Livonia, MI 48152","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Meridian Mall","city":"Okemos","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Grand River Ave. & Marsh Rd., Okemos, MI 48864","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Miller Hill Mall","city":"Duluth","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US 53 & Decker Rd. SE., Duluth, MN 55811","phone":"","email":"","website":"https://business.simon.com/search","notes":""},
  {"name":"Turtle Creek Mall","city":"Hattiesburg","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"NWC Weathersby Rd. & US 98, Hattiesburg, MS 39402","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Mid Rivers Mall","city":"Peters","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"I-70 & Mid Rivers Mall Dr., St. Peters, MO 63376","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Northpark Mall","city":"Joplin","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Range Line Rd. & Third St., Joplin, MO 64801","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"South County Center","city":"Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Union Rd. & Lemay Ferry Rd. , St. Louis, MO 63129-1006","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Meadowood Mall","city":"Reno","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"S. Virginia St. & S. McCarran Blvd. Expwy., Reno, NV 89502","phone":"","email":"simon-5255@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Menlo Park Mall","city":"Edison","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rt. 1 & Parsonage Rd., Edison, NJ 08837","phone":"","email":"simon-4666@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Moorestown Mall","city":"Moorestown","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Rt. 38 & Lenola Rd., Moorestown, NJ 08057","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Newport Centre","city":"City","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Washington Blvd. & 6th St., Jersey City, NJ 07310","phone":"","email":"simon-2810@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Ocean County Mall","city":"River","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Bay & Hooper Aves., Toms River, NJ 08753","phone":"","email":"simon-4832@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Quaker Bridge Mall","city":"Lawrenceville","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US Rt. 1 & Quaker Bridge Mall Rd., Lawrenceville, NJ 08648","phone":"","email":"simon-7705@simon.com","website":"https://business.simon.com/search","notes":"Confirmed: coin-operated chairs listed on official Simon amenities page. Operator not named as Smarte Carte."},
  {"name":"Smith Haven Mall","city":"Grove","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Routes 25 & 347/NE, Lake Grove, NY 11755","phone":"","email":"simon-3632@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"The Shops at Hudson Yards","city":"York","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"20 Hudson Yards, New York, NY 10001","phone":"","email":"","website":"https://www.hudsonyardsnewyork.com/shop/","notes":""},
  {"name":"Westfield World Trade Center","city":"York","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"185 Greenwich St., New York, NY 10007","phone":"","email":"wwtcconcierge@westfield.com","website":"https://www.westfield.com/en/united-states/westfieldworldtradecenter/retailers","notes":""},
  {"name":"Cross Creek Mall","city":"Fayetteville","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Morganton Rd. & 401 Bypass & Skibo Rd., Fayetteville, NC 28303","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Jacksonville Mall","city":"Jacksonville","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Western Blvd. btwn Rtes 17 & 24, Jacksonville, NC 28546","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Capital City Mall","city":"Hill","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Rt. 15 & Capital City Mall Dr., Camp Hill, PA 17011","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Lehigh Valley Mall","city":"Whitehall","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Route 22 & MacArthur Rd., Whitehall, PA 18052","phone":"","email":"simon-7711@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Oxford Valley Mall","city":"Langhorne","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US Rt 1, I-95 & Oxford Valley Rd., Langhorne, PA 19047","phone":"","email":"simon-7707@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Plymouth Meeting Mall","city":"Meeting","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Germantown & Hickory Rd., Plymouth Meeting, PA 19462","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"South Hills Village","city":"Pittsburgh","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rt. 19 South & Fort Couch Rd., Pittsburgh, PA 15241","phone":"","email":"simon-4674@simon.com","website":"https://business.simon.com/search","notes":"Has Smarte Carte chairs per audit."},
  {"name":"Springfield Mall","city":"Springfield","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rt. 320 & Baltimore Pike, Springfield, PA 19064","phone":"","email":"","website":"https://business.simon.com/search","notes":""},
  {"name":"Stroud Mall","city":"Stroudsburg","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Rt. 611 & Bridge St., Stroudsburg, PA 18360","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Viewmont Mall","city":"Scranton","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"Rte 6 (Scranton Expressway) & I-81, Scranton, PA 18508","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Westmoreland Mall","city":"Greensburg","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"5256 Route 30, Greensburg, PA 15601","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"York Galleria","city":"York","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Rts. 30 & 24, York, PA 17402","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Magnolia Mall","city":"Florence","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"I-20 & I-95, Florence, SC 29501","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Northwoods Mall","city":"Charleston","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Rt. 52 & I-26, N. Charleston, SC 29406","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Hamilton Place","city":"Chattanooga","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"I-75 & Shallowford Rd., Chattanooga, TN 37421","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Northgate Mall","city":"Chattanooga","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Hwy. 153 & Hixson Pike, Chattanooga, TN 37415","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Old Hickory Mall","city":"Jackson","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Old Hickory Blvd. & US Hwy. 45, Jackson, TN 38305","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Apple Blossom Mall","city":"Winchester","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US 50 & I-81, Winchester, VA 22601","phone":"","email":"simon-4915@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Patrick Henry Mall","city":"News","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"PREIT","operatedBy":"PREIT","address":"I-64 & Rt. 143, Newport News, VA 23602","phone":"","email":"","website":"https://www.preit.com/portfolio/","notes":""},
  {"name":"Valley View Mall","city":"Roanoke","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"I-581 & Hershberger Rd., Roanoke, VA 24012","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"Columbia Center","city":"Kennewick","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Canal Drive & Columbia Ctr. Blvd., Kennewick, WA 99336","phone":"","email":"simon-8262@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Bay Park Square","city":"Bay","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Oneida St. & Pilgrim Way, Green Bay, WI 54304","phone":"","email":"simon-8099@simon.com","website":"https://business.simon.com/search","notes":""},
  {"name":"Brookfield Square","city":"Brookfield","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"I-94 & Moorland Rd., Brookfield, WI 53005","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""},
  {"name":"West Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"CBL Properties","operatedBy":"CBL Properties","address":"Gammon & Mineral Point Rds., Madison, WI 53719","phone":"","email":"","website":"https://www.cblproperties.com/portfolio","notes":""}
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
  const [userNotes, setUserNotes] = useState({});
  const [noteDraft, setNoteDraft] = useState('');
  const [edits, setEdits] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const db = getFirestore(app);
        const notesSnap = await getDoc(doc(db, 'opportunities', 'notes'));
        if (notesSnap.exists()) setUserNotes(notesSnap.data() || {});
        const editsSnap = await getDoc(doc(db, 'opportunities', 'edits'));
        if (editsSnap.exists()) setEdits(editsSnap.data() || {});
      } catch (e) {
        try {
          const stored = localStorage.getItem('opportunities-notes');
          if (stored) setUserNotes(JSON.parse(stored));
          const storedEdits = localStorage.getItem('opportunities-edits');
          if (storedEdits) setEdits(JSON.parse(storedEdits));
        } catch (err) {}
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selected) {
      const key = selected.name + '|' + selected.state;
      setNoteDraft(userNotes[key] || '');
    }
  }, [selected, userNotes]);

  const saveNote = async () => {
    if (!selected) return;
    const key = selected.name + '|' + selected.state;
    const next = { ...userNotes, [key]: noteDraft };
    setUserNotes(next);
    try { localStorage.setItem('opportunities-notes', JSON.stringify(next)); } catch (e) {}
    try {
      const db = getFirestore(app);
      await setDoc(doc(db, 'opportunities', 'notes'), next);
    } catch (e) {}
  };

  const saveEdit = async () => {
    if (!selected) return;
    const key = selected.name + '|' + selected.state;
    const next = { ...edits, [key]: editDraft };
    setEdits(next);
    try { localStorage.setItem('opportunities-edits', JSON.stringify(next)); } catch (e) {}
    try {
      const db = getFirestore(app);
      await setDoc(doc(db, 'opportunities', 'edits'), next);
    } catch (e) {}
    setEditMode(false);
  };

  const startEdit = () => {
    if (!selected) return;
    const key = selected.name + '|' + selected.state;
    const existing = edits[key] || {};
    setEditDraft({
      city: existing.city || selected.city || '',
      owner: existing.owner || selected.owner || '',
      operatedBy: existing.operatedBy || selected.operatedBy || '',
      address: existing.address || selected.address || '',
      phone: existing.phone || selected.phone || '',
      email: existing.email || selected.email || '',
      website: existing.website || selected.website || '',
    });
    setEditMode(true);
  };

  const getField = (v, field) => {
    const key = v.name + '|' + v.state;
    return (edits[key] && edits[key][field]) || v[field] || '';
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setFontSize(14);
    doc.text('Indoor Venues — Filtered List', 14, 15);
    doc.setFontSize(9);
    doc.text(`${filtered.length} venues`, 14, 21);

    const rows = filtered.map(v => [
      v.name,
      v.city || '',
      v.state,
      v.hasSmarteCarte ? 'Yes' : 'No',
      v.owner || '',
      (v.address || '').substring(0, 40),
      userNotes[v.name + '|' + v.state] || ''
    ]);

    doc.autoTable({
      startY: 25,
      head: [['Name', 'City', 'State', 'Chairs', 'Owner', 'Address', 'Notes']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 78, 121], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 22 },
        2: { cellWidth: 12 },
        3: { cellWidth: 14 },
        4: { cellWidth: 28 },
        5: { cellWidth: 40 },
        6: { cellWidth: 30 }
      },
      margin: { left: 10, right: 10 }
    });

    doc.save('venues-filtered.pdf');
  };

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
          <button onClick={downloadPDF} style={{ marginLeft: 12, padding: '4px 10px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            Download PDF
          </button>
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
                  {userNotes[v.name + '|' + v.state] && <span style={{ marginLeft: 6, fontSize: 11, color: '#666' }}>note</span>}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{v.city}, {v.state} · {v.type}</div>
                {getField(v, 'owner') && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{getField(v, 'owner')}</div>}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0 }}>Detail</h3>
          {!selected && <p className="muted">Select a venue to see details.</p>}
          {selected && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: '0 0 8px' }}><strong>{selected.name}</strong></p>
                {!editMode && <button onClick={startEdit} style={{ padding: '4px 10px', fontSize: 12, background: 'var(--iron)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Edit</button>}
              </div>
              <p className="muted" style={{ margin: '0 0 12px' }}>{getField(selected, 'city')}, {selected.state}</p>
              <p style={{ margin: '0 0 8px' }}>Type: {selected.type}</p>
              {editMode ? (
                <>
                  {['city','owner','operatedBy','address','phone','email','website'].map(f => (
                    <label key={f} style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      <input
                        value={editDraft[f] || ''}
                        onChange={(e) => setEditDraft({ ...editDraft, [f]: e.target.value })}
                        style={{ width: '100%', padding: 6, marginTop: 2, fontSize: 13, border: '1px solid var(--line)', borderRadius: 4 }}
                      />
                    </label>
                  ))}
                  <button onClick={saveEdit} style={{ padding: '6px 12px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Save</button>
                  <button onClick={() => setEditMode(false)} style={{ marginLeft: 8, padding: '6px 12px', background: 'var(--iron)', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 8px' }}>Owner: {getField(selected, 'owner') || '—'}</p>
                  <p style={{ margin: '0 0 8px' }}>Operated by: {getField(selected, 'operatedBy') || '—'}</p>
                  <p style={{ margin: '0 0 8px' }}>Address: {getField(selected, 'address') || '—'}</p>
                  <p style={{ margin: '0 0 8px' }}>Phone: {getField(selected, 'phone') || '—'}</p>
                  <p style={{ margin: '0 0 8px' }}>Email: {getField(selected, 'email') || '—'}</p>
                  {getField(selected, 'website') && <p style={{ margin: '0 0 8px' }}>Website: <a href={getField(selected, 'website')} target="_blank" rel="noreferrer">{getField(selected, 'website')}</a></p>}
                </>
              )}
              {selected.notes && <p style={{ margin: '8px 0', padding: '8px', background: '#fff3cd', borderRadius: 4 }}>Flag: {selected.notes}</p>}
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Your note</label>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note about this venue..."
                  style={{ width: '100%', minHeight: 60, marginTop: 4, padding: 8, fontSize: 13, border: '1px solid var(--line)', borderRadius: 4 }}
                />
                <button onClick={saveNote} style={{ marginTop: 6, padding: '6px 12px', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                  Save note
                </button>
                {userNotes[selected.name + '|' + selected.state] && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#2e7d32' }}>Saved</span>
                )}
              </div>
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
