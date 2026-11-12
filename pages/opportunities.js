import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const VENUES = [
  {"name":"Thrive Family Fun Center","city":"","state":"","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Anchorage 5th Avenue Mall","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"320 W 5th Ave., Anchorage, AK 99501","phone":"(907) 258-4003","email":"","website":"http://www.shopsimon.com"},
  {"name":"Bentley Mall","city":"Fairbanks","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Dimond Center","city":"Anchorage","state":"AK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dimond Blvd. & Old Seward Hwy., Anchorage, AK 99515-2028","phone":"","email":"","website":"http://www.dimondcenter.com"},
  {"name":"Auburn Mall","city":"Auburn","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"385 Southbridge St, Auburn, MA 01501","phone":"(508) 832-2314","email":"","website":""},
  {"name":"Eastdale Mall","city":"Montgomery","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Atlanta Highway & Eastern Blvd., Montgomery, AL 36117","phone":"","email":"","website":"http://www.aronov.com"},
  {"name":"Parkway Place","city":"Huntsville","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Memorial Pkwy.(U.S.231) & Drake Ave., Huntsville, AL 35801","phone":"","email":"","website":"http://www.parkwayplacemall.com"},
  {"name":"Riverchase Galleria","city":"Hoover","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"2000 Riverchase Galleria, Hoover, AL 35244","phone":"(205) 985-3000","email":"","website":"http://www.riverchasegalleria.com"},
  {"name":"The Shoppes at Bel Air","city":"Mobile","state":"AL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Airport Blvd. & I-65 Service Rd., Mobile, AL 36606","phone":"","email":"","website":"http://www.shopatbelairmall.com"},
  {"name":"Central Mall","city":"Fort Smith","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rogers Ave. & Waldron Rd., Fort Smith, AR 72903","phone":"","email":"","website":"http://www.centralmallfortsmith.com"},
  {"name":"Hot Springs Mall","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Central Ave. & Mall Drive, Hot Springs, AR 71913","phone":"","email":"","website":"http://www.shopmalls.com"},
  {"name":"McCain Mall","city":"North Little Rock","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 67-167 & McCain Blvd., North Little Rock, AR 72116","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Northwest Arkansas Mall","city":"Fayetteville","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Rt. 71B & Zion Road, Fayetteville, AR 72703-5123","phone":"","email":"","website":"http://www.northwestarkansasmall.com"},
  {"name":"Northwest Arkansas Mall - Fayetteville","city":"","state":"AR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Rt. 71B & Zion Road, Fayetteville, AR 72703-5123","phone":"","email":"","website":"http://www.northwestarkansasmall.com"},
  {"name":"Park Plaza Mall","city":"Little Rock","state":"AR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"University Ave. & W. Markham St., Little Rock, AR 72205","phone":"","email":"","website":"http://www.parkplazamall.com"},
  {"name":"Arizona Mills","city":"Tempe","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"5000 S Arizona Mills Cir, Tempe, AZ 85282","phone":"(480) 491-7300","email":"","website":"http://www.shopsimon.com"},
  {"name":"Arrowhead Towne Center","city":"Glendale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7700 W Arrowhead Towne Center, Glendale, AZ 85308","phone":"(623) 979-7720","email":"","website":"http://www.arrowheadtownecenter.com"},
  {"name":"Chandler Fashion Center","city":"Chandler","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"Chandler Blvd. & Price Frwy., Chandler, AZ 85226","phone":"","email":"","website":"http://www.westcor.com"},
  {"name":"Desert Sky Mall","city":"Phoenix","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"75th Ave. & Thomas Rd., Phoenix, AZ 85033","phone":"","email":"","website":"http://www.desertskymall.com"},
  {"name":"Scottsdale Fashion Square","city":"Scottsdale","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7014 E Camelback Rd, Scottsdale, AZ 85251","phone":"(480) 990-7800","email":"","website":"http://www.fashionsquare.com"},
  {"name":"Superstition Springs Center","city":"","state":"AZ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 60 & Power Rd., Mesa, AZ 85206","phone":"","email":"","website":"http://www.westcor.com"},
  {"name":"Tucson Mall","city":"Tucson","state":"AZ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Oracle & Wetmore Rds., Tucson, AZ 85705","phone":"","email":"","website":"http://www.shoptucsonmall.com"},
  {"name":"Beverly Center","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"La Cienega, San Vicente, Beverly Blvd., Los Angeles, CA 90048","phone":"","email":"","website":"http://www.beverlycenter.com"},
  {"name":"Brea Mall","city":"Brea","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1065 Brea Mall, Brea, CA 92821","phone":"(714) 990-2732","email":"","website":"http://www.simon.com"},
  {"name":"Centerpoint Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Saviers Rd. & Channel Islands Blvd., Oxnard, CA 93033","phone":"","email":"","website":"http://www.centerpoint-mall.com"},
  {"name":"Coddingtown Mall","city":"Santa Rosa","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"US 101, Guerneville Rd., Cleveland Ave., Santa Rosa, CA 95401","phone":"","email":"","website":"http://www.coddingtownmall.com"},
  {"name":"Del Amo Fashion Center","city":"Torrance","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3525 Carson St, Torrance, CA 90503","phone":"(310) 542-8525","email":"","website":"http://www.simon.com"},
  {"name":"Eagle Rock Plaza","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Frwys. 2 & 134, Los Angeles, CA 90041","phone":"","email":"","website":"http://www.shopeaglerock.com"},
  {"name":"Eagle Rock Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Frwys. 2 & 134, Los Angeles, CA 90041","phone":"","email":"","website":"http://www.shopeaglerock.com"},
  {"name":"Fashion Square","city":"Sherman Oaks","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"14006 Riverside Drive, Sherman Oaks, CA 91423","phone":"(480) 990-7800","email":"","website":"http://www.simon.com"},
  {"name":"Fashion Valley","city":"San Diego","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7007 Friars Rd, San Diego, CA 92108","phone":"(619) 297-3381","email":"","website":"http://www.ggp.com"},
  {"name":"Ferry Building Marketplace","city":"San Francisco","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":"","website":"http://www.westfield.com/galleriaatroseville"},
  {"name":"Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":"","website":"http://www.westfield.com/galleriaatroseville"},
  {"name":"Glendale Galleria","city":"Glendale","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"Broadway, Colorado, Columbus, Brand & Central, Glendale, CA 91210","phone":"","email":"","website":"http://www.glendalegalleria.com"},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"447 Great Mall Dr, Milpitas, CA 95035","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Great Mall","city":"Milpitas","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"447 Great Mall Dr, Milpitas, CA 95035","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Hemet Valley Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Florida Ave. @ Kirby & Gilmore St., Hemet, CA 92545","phone":"","email":"","website":"http://www.thehemetvalleymall.com"},
  {"name":"Inland Center Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Inland Center Dr. & I-215, San Bernardino, CA 92408","phone":"","email":"","website":"http://www.macerich.com"},
  {"name":"Lakewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Lakewood & Del Amo Blvds., Lakewood, CA 90712","phone":"","email":"","website":"http://www.shoplakewoodcenter.com"},
  {"name":"Los Cerritos Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"605 Fwy. @ South St., Cerritos, CA 90703-5422","phone":"","email":"","website":"http://www.shoploscerritos.com"},
  {"name":"Merced Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Olive Ave. & R St., Merced, CA 95340","phone":"","email":"","website":"http://www.mercedmall.com"},
  {"name":"Mess Hall at Flight","city":"Tustin","state":"CA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Mission Viejo (The Shops at)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-5 (San Diego Frwy). & Crown Valley Pkwy., Mission Viejo, CA 92691","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Moreno Valley Mall At Towngate","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Day St. & Hwy. 60, Moreno Valley, CA 92553","phone":"","email":"","website":"http://www.morenovalleymall.com"},
  {"name":"Ontario Mills","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Interstates 10 & 15, Ontario, CA 91764","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Panorama Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Van Nuys Blvd. & Roscoe, Panorama City, CA 91402","phone":"","email":"","website":"http://www.panoramamall.com"},
  {"name":"Plaza Bonita","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-805 & Sweetwater Rd., National City, CA 91950","phone":"","email":"","website":"http://www.westfield.com/plazabonita"},
  {"name":"Puente Hills Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Azusa Ave. & Pomona Frwy., City of Industry, CA 91748","phone":"","email":"","website":"http://www.puentehills-mall.com"},
  {"name":"Santa Rosa Plaza","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 101 & 3rd St., Santa Rosa, CA 95401","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"South Bay Galleria","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Artesia & Hawthorne Blvd., Redondo Beach, CA 90278","phone":"","email":"","website":"http://www.southbaygalleria.com"},
  {"name":"South Coast Plaza","city":"Costa Mesa","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Bristol St. & 405 Frwy., Costa Mesa, CA 92626","phone":"","email":"","website":"http://www.southcoastplaza.com"},
  {"name":"Stonewood Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Firestone Blvd. & Lakewood Blvd., Downey, CA 90241","phone":"","email":"","website":"http://www.shopstonewoodcenter.com"},
  {"name":"The Oaks Shopping Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Lynn Rd., Hillcrest Dr., 101 Fwy, Thousand Oaks, CA 91360","phone":"","email":"","website":"http://www.shoptheoaksmall.com"},
  {"name":"The Shops at Mission Viejo","city":"Mission Viejo","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-5 (San Diego Frwy). & Crown Valley Pkwy., Mission Viejo, CA 92691","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Valencia Town Center","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Victor Valley (The Mall of)","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-15 & Bear Valley Rd., Victorville, CA 92392","phone":"","email":"","website":"http://www.themallofvictorvalley.com"},
  {"name":"Vintage Faire Mall","city":"","state":"CA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dale Rd. & Standiford Ave., Modesto, CA 95356","phone":"","email":"","website":"http://www.shopvintagefairemall.com"},
  {"name":"Westfield Century City","city":"Los Angeles","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"10250 Santa Monica Blvd., Los Angeles, CA 90067","phone":"","email":"","website":""},
  {"name":"Westfield Culver City","city":"Culver City","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6000 Sepulveda Boulevard, Culver City, CA 90230","phone":"","email":"","website":"http://www.westfield.com/culvercity"},
  {"name":"Westfield Galleria at Roseville","city":"Roseville","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"1151 Galleria Blvd., Roseville, CA 95678","phone":"(916) 787-2000","email":"","website":"http://www.westfield.com/galleriaatroseville"},
  {"name":"Westfield Topanga","city":"Canoga Park","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"6600 Topanga Canyon Boulevard, Canoga Park, CA 91303","phone":"","email":"","website":"http://www.westfield.com/topanga"},
  {"name":"Westfield Valley Fair","city":"San Jose","state":"CA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2855 Stevens Creek Blvd., Santa Clara, CA 95050","phone":"(408) 248-4450","email":"","website":"http://www.westfield.com/valleyfair"},
  {"name":"Cherry Creek Shopping Center","city":"Denver","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"3000 E 1st Avenue, Denver, CO 80206","phone":"(303) 388-3900","email":"","website":"http://www.shopcherrycreek.com"},
  {"name":"Colorado Mills","city":"Lakewood","state":"CO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"14500 W Colfax Ave, Lakewood, CO 80401","phone":"(303) 590-1634","email":"","website":"http://www.simon.com"},
  {"name":"FlatIron Crossing","city":"Broomfield","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 36 @ Storage Tek/Interlocken Loop Exit, Broomfield, CO 80021","phone":"","email":"","website":"http://www.flatironcrossing.com"},
  {"name":"Park Meadows","city":"Lone Tree","state":"CO","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"I-25 @ County Line & C-470 @ Yosemite, Lone Tree, CO 80124","phone":"","email":"","website":"http://www.parkmeadows.com"},
  {"name":"Brass Mill Center","city":"Waterbury","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-84 & Route 8, Waterbury, CT 06706","phone":"","email":"","website":"http://www.brassmillcenter.com"},
  {"name":"Connecticut Post Mall","city":"Milford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-95 & Boston Post Rd. (U.S. Rte 1), Milford, CT 06460-2703","phone":"","email":"","website":"http://www.westfield.com/connecticutpost"},
  {"name":"Danbury Fair Mall","city":"Danbury","state":"CT","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"7 Backus Ave, Danbury, CT 06810","phone":"(203) 743-3247","email":"","website":"http://www.danburyfairmall.com"},
  {"name":"Westfarms","city":"West Hartford","state":"CT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"New Britain Ave. @ South Rd., Farmington, CT 06032","phone":"","email":"","website":"http://www.shopwestfarms.com"},
  {"name":"Christiana Mall","city":"Newark","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"132 Christiana Mall, Newark, DE 19702","phone":"(302) 731-9815","email":"","website":"http://www.shopchristianamall.com"},
  {"name":"Concord Mall","city":"Wilmington","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Naaman's Rd. & Concord Pike, Wilmington, DE 19803","phone":"","email":"","website":""},
  {"name":"Dover Mall","city":"Dover","state":"DE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"1365 N DuPont Hwy, Dover, DE 19901","phone":"(302) 678-4000","email":"","website":"http://www.dovermall.com"},
  {"name":"Aventura Mall","city":"Aventura","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Biscayne Blvd. & 196th St., Aventura, FL 33180","phone":"","email":"","website":"http://www.aventuramall.com"},
  {"name":"Brandon Town Center","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Broward Mall","city":"Plantation","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Broward Blvd. & University Dr., Plantation, FL 33324","phone":"","email":"","website":"http://www.westfield.com/broward"},
  {"name":"Broward Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Broward Blvd. & University Dr., Plantation, FL 33324","phone":"","email":"","website":"http://www.westfield.com/broward"},
  {"name":"International Plaza","city":"Tampa","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Boy Scout Blvd. & West Shore Blvd., Tampa, FL 33607","phone":"","email":"","website":"http://www.shopinternationalplaza.com"},
  {"name":"Miami International Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"NW 107th Ave. & SR 836, Doral, FL 33172","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Oviedo Mall","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Red Bug Lake Rd. & Rte. 417, Oviedo, FL 32765","phone":"","email":"","website":"http://www.oviedomarketplace.com"},
  {"name":"Sawgrass Mills","city":"Sunrise","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"","website":""},
  {"name":"Southland Mall - Cutler Bay","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 1 & Caribbean Blvd., Miami, FL 33189","phone":"","email":"","website":"http://www.mysouthlandmall.com"},
  {"name":"The Mall at Millenia","city":"Orlando","state":"FL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-4 & Conroy Road, 1 Mile E of Universal Studio, Orlando, FL 32839","phone":"","email":"","website":"http://www.mallatmillenia.com"},
  {"name":"University Mall - Tampa","city":"","state":"FL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Lenox Square","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Peachtree St. NE & Lenox Rd., Atlanta, GA 30326","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Mall of Georgia","city":"Buford","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-85 & S.R. 20, Buford, GA 30519","phone":"","email":"","website":"http://www.mallofgeorgia.com"},
  {"name":"North Point Mall","city":"Alpharetta","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Georgia 400 & Haynes Bridge Rd., Alpharetta, GA 30022","phone":"","email":"","website":"http://www.northpointmall.com"},
  {"name":"Perimeter Mall","city":"Dunwoody","state":"GA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hammond Dr. & Perimeter Center Wesst, Atlanta, GA 30346","phone":"","email":"","website":"http://www.perimetermall.com"},
  {"name":"Ponce City Market","city":"Atlanta","state":"GA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Jamestown","operatedBy":"Jamestown","address":"","phone":"","email":"","website":""},
  {"name":"Southlake Mall - Morrow","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Jonesboro Road & I-75 South, Morrow, GA 30260","phone":"","email":"","website":"http://www.shopsouthlakemall.com"},
  {"name":"Sugarloaf Mills Mall","city":"","state":"GA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Ala Moana Center","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1450 Ala Moana Blvd, Honolulu, HI 96814","phone":"(808) 955-9517","email":"","website":""},
  {"name":"Kahala Mall","city":"Honolulu","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Waialae Ave. @ Hunakai & Kilauea, Honolulu, HI 96816-5319","phone":"","email":"","website":"http://www.kahalamallcenter.com"},
  {"name":"Pearlridge Center","city":"Aiea","state":"HI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Moanalua Rd., Kamehameha Hwy., Aiea, HI 96701","phone":"","email":"","website":"http://www.pearlridgeonline.com"},
  {"name":"Coral Ridge Mall","city":"Coralville","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-80, U.S.Hwy. 965 & U.S.Hwy. 6, Coralville, IA 52241","phone":"","email":"","website":"http://www.coralridgemall.com"},
  {"name":"Jordan Creek Town Center","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Jordan Creek Pkwy (old 74th St.) & Mills Civic Pky, West Des Moines, IA 50266","phone":"","email":"","website":"http://www.jordancreektowncenter.com"},
  {"name":"NorthPark Mall - Davenport","city":"","state":"IA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 61 & Kimberly Rd., Davenport, IA 52806","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Valley West Mall","city":"West Des Moines","state":"IA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Boise Towne Square","city":"Boise","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Milwaukee St. & Franklin Rd., Boise, ID 83704","phone":"","email":"","website":"http://www.boisetownsquare.com"},
  {"name":"Grand Teton Mall","city":"Idaho Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"17th St. & Hitt Rd, Idaho Falls, ID 83404","phone":"","email":"","website":"http://www.grandtentonmall.com"},
  {"name":"Magic Valley Mall","city":"Twin Falls","state":"ID","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Blue Lakes Blvd. & Pole Line Rd., Twin Falls, ID 83301","phone":"","email":"","website":"http://www.magicvalleymall.com"},
  {"name":"Chicago Premium Outlets","city":"Aurora","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"1650 Premium Outlet Blvd, Aurora, IL 60502","phone":"(630) 692-1451","email":"","website":"http://www.theplazamall.org"},
  {"name":"Fashion Outlets of Chicago","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-294 @ Balmoral Ave., Rosemont, IL 60018","phone":"","email":"","website":"http://www.awetalisman.com"},
  {"name":"Gurnee Mills","city":"Gurnee","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-94 & Grand Ave. (IL 132), Gurnee, IL 60031","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Oakbrook Center","city":"Oak Brook","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"100 Oakbrook Center, Oak Brook, IL 60523","phone":"(630) 573-0700","email":"","website":"http://www.theplazamall.org"},
  {"name":"Orland Square Shopping Center","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"151st St. & LaGrange Rd. (Rt.45), Orland Park, IL 60462","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Water Tower Place","city":"Chicago","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Michigan Ave. @ Pearson & Chestnut, Chicago, IL 60611","phone":"","email":"","website":"http://www.shopwatertower.com"},
  {"name":"Westfield Old Orchard","city":"Skokie","state":"IL","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"4905 Old Orchard Center, Skokie, IL 60077","phone":"","email":"","website":"http://www.theplazamall.org"},
  {"name":"White Oaks Mall","city":"","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 36 & Hwy. 68 Bypass/NE, Springfield, IL 62704","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Woodfield Mall","city":"Schaumburg","state":"IL","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Woodfield Dr. SW of I-90 & IL 53, Schaumburg, IL 60173","phone":"","email":"","website":"http://www.shopwoodfield.com"},
  {"name":"Castleton Square","city":"Indianapolis","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"6020 E 82nd St, Indianapolis, IN 46250","phone":"(317) 849-9994","email":"","website":"http://www.simon.com"},
  {"name":"College Mall","city":"Bloomington","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2894 E 3rd St, Bloomington, IN 47401","phone":"(812) 339-9370","email":"","website":"http://www.simon.com"},
  {"name":"Eastland Mall","city":"Evansville","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Hwy 66 & Green River Road, Evansville, IN 47715","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Eastland Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy 66 & Green River Road, Evansville, IN 47715","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Fashion Mall at Keystone","city":"Indianapolis","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"E. 86th St. & Keystone Ave., Indianapolis, IN 46240","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Greenwood Park Mall","city":"Greenwood","state":"IN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"US 31 & County Line Rd. SE., Greenwood, IN 46142","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Greenwood Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 31 & County Line Rd. SE., Greenwood, IN 46142","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Lighthouse Place Premium Outlets","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Tippecanoe Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 52 & SR 38, Lafayette, IN 47905","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"University Park Mall","city":"","state":"IN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR 23 & Grape Road, Mishawaka, IN 46545","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Oak Park Mall","city":"Overland Park","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"95th & Quivira Rd., Overland Park, KS 66214","phone":"","email":"","website":"http://www.thenewoakparkmall.com"},
  {"name":"Town Center Plaza","city":"Leawood","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kellogg Dr. & Rock Rd., Wichita, KS 67207","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Towne East Square","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kellogg Dr. & Rock Rd., Wichita, KS 67207","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"West Ridge Mall","city":"Topeka","state":"KS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"21st & Wanamaker, Topeka, KS 66604","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"West Ridge Mall","city":"","state":"KS","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"21st & Wanamaker, Topeka, KS 66604","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Fayette Mall","city":"Lexington","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Reynolds & Nicholasville Rds., Lexington, KY 40503-3693","phone":"","email":"","website":"http://www.shopfayette-mall.com"},
  {"name":"Mall St. Matthews","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Shelbyville Rd. & Bowling Blvd., Louisville, KY 40207","phone":"","email":"","website":"http://www.ggp.com"},
  {"name":"Oxmoor Center","city":"Louisville","state":"KY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-264 & Shelbyville Rd. , Louisville, KY 40222","phone":"","email":"","website":"http://www.oxmoorcenter.com"},
  {"name":"Lakeside Shopping Center","city":"Metairie","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"N. Causeway Blvd. & Severn Avenue, Metairie, LA 70002","phone":"","email":"","website":"http://www.lakesideshopping.com"},
  {"name":"Mall of Louisiana","city":"Baton Rouge","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"6401 Bluebonnet Blvd, Baton Rouge, LA 70836","phone":"(225) 761-7220","email":"","website":"http://www.mallofla.com"},
  {"name":"Prien Lake Mall","city":"","state":"LA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Prien Lake Rd. & Ernest St., Lake Charles, LA 70601","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Esplanade","city":"Kenner","state":"LA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Burlington Mall","city":"Burlington","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"75 Middlesex Turnpike, Burlington, MA 01803","phone":"(781) 272-8668","email":"","website":"http://www.simon.com"},
  {"name":"CambridgeSide","city":"Cambridge","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"CambridgeSide Place & Edwin Land Blvd., Cambridge, MA 02141","phone":"","email":"","website":"http://www.shopcambridgeside.com"},
  {"name":"Natick Mall","city":"Natick","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"1245 Worcester St, Natick, MA 01760","phone":"(508) 655-4800","email":"","website":"http://www.natickmall.com"},
  {"name":"Northshore Mall","city":"Peabody","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rts. 128 N & 114 E, Peabody, MA 01960","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Quincy Market","city":"Boston","state":"MA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"South Shore Plaza","city":"Braintree","state":"MA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Granite St. & Rts. 37 & 128, Braintree, MA 02184","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Arundel Mills","city":"Hanover","state":"MD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"7000 Arundel Mills Cir, Hanover, MD 21076","phone":"(410) 540-5110","email":"","website":""},
  {"name":"The Mall in Columbia","city":"Columbia","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"10300 Little Patuxent Pkwy, Columbia, MD 21044","phone":"(410) 730-3300","email":"","website":"http://www.themallincolumbia.com"},
  {"name":"Towson Town Center","city":"Towson","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"825 Dulaney Valley Rd, Towson, MD 21204","phone":"(410) 825-3535","email":"","website":"http://www.towsontowncenter.com"},
  {"name":"Westfield Montgomery","city":"Bethesda","state":"MD","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"7101 Democracy Boulevard, Bethesda, MD 20817","phone":"(301) 469-6000","email":"","website":"http://www.westfield.com/montgomery"},
  {"name":"Bangor Mall","city":"Bangor","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rt. 95, Hogan Rd., & Stillwater Ave., Bangor, ME 04401","phone":"","email":"","website":"http://www.bangormall.com"},
  {"name":"The Maine Mall","city":"South Portland","state":"ME","hasSmarteCarte":false,"type":"enclosed mall","owner":"Brookfield Properties","operatedBy":"Brookfield Properties","address":"Maine Mall & Gorham Rds., South Portland, ME 04106-3206","phone":"","email":"","website":"http://www.ggp.com"},
  {"name":"Briarwood Mall","city":"Ann Arbor","state":"MI","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"100 Briarwood Cir, Ann Arbor, MI 48108","phone":"(734) 769-9610","email":"","website":"http://www.simon.com"},
  {"name":"Great Lakes Crossing","city":"Auburn Hills","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"4000 Baldwin Road, Auburn Hills, MI 48326","phone":"(248) 454-5010","email":"","website":"http://www.shopgreatlakescrossing.com"},
  {"name":"Somerset Collection","city":"Troy","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"W. Big Beaver Rd. @ Coolidge, Troy, MI 48084","phone":"","email":"","website":"http://www.thesomersetcollection.com"},
  {"name":"Twelve Oaks Mall","city":"Novi","state":"MI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Novi & Twelve Mile Rds., Novi, MI 48377","phone":"","email":"","website":"http://www.shoptwelveoaks.com"},
  {"name":"Mall of America","city":"Bloomington","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"Cedar Ave. (Hwy. 77) & E. 81st St. SE., Bloomington, MN 55425","phone":"","email":"","website":"http://www.mallofamerica.com"},
  {"name":"Mall of America","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Cedar Ave. (Hwy. 77) & E. 81st St. SE., Bloomington, MN 55425","phone":"","email":"","website":"http://www.mallofamerica.com"},
  {"name":"Ridgedale Center","city":"Minnetonka","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-394 & Ridgedale Dr., Minnetonka, MN 55305","phone":"","email":"","website":"http://www.ridgedalecenter.com"},
  {"name":"Rosedale Center","city":"Roseville","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Country Road B2 between Snelling and Fairview, Roseville, MN 55113","phone":"","email":"","website":"http://www.myrosedale.com"},
  {"name":"Southdale Center","city":"Edina","state":"MN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"West 66th & 69th Sts. & France Ave. South, Edina, MN 55435","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Southdale Shopping Center - Edina","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"France Ave. & 69th St., Edina, MN 55435","phone":"","email":"","website":"http://www.galleriaedina.com"},
  {"name":"Twin Cities Premium Outlets","city":"","state":"MN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"France Ave. & 69th St., Edina, MN 55435","phone":"","email":"","website":"http://www.galleriaedina.com"},
  {"name":"Battlefield Mall","city":"Springfield","state":"MO","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2825 S Glenstone Ave, Springfield, MO 65804","phone":"(417) 883-4111","email":"","website":"http://www.simon.com"},
  {"name":"Independence Center","city":"Independence","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-70 & M291 @ 39th St., Independence, MO 64057","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Saint Louis Galleria","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-64/40 & I-170, St. Louis, MO 63117","phone":"","email":"","website":"http://www.saintlouisgalleria.com"},
  {"name":"West County Center","city":"St. Louis","state":"MO","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Manchester & I-270, Des Peres, MO 63131","phone":"","email":"","website":"http://www.shopwestcountycenter.com"},
  {"name":"Edgewater Mall","city":"Biloxi","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Beach Blvd. (Hwy 90) & Eisenhower Dr., Biloxi, MS 39531","phone":"","email":"","website":"http://www.edgewatermall.com"},
  {"name":"Mall at Barnes Crossing","city":"Tupelo","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy 45, Hwy 78 & Barnes Crossing Rd., Tupelo, MS 38804","phone":"","email":"","website":"http://www.barnescrossing.com"},
  {"name":"Northpark Mall","city":"Ridgeland","state":"MS","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Wheatley & County Line Rds., Ridgeland, MS 39157","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Holiday Village Mall","city":"Great Falls","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"9th & 10th Ave. South, Great Falls, MT 59405","phone":"","email":"","website":"http://www.holidayvillagemall.com"},
  {"name":"Rimrock Mall","city":"Billings","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Central & S. 24th St. West, Billings, MT 59102","phone":"","email":"","website":"http://www.rimrockmall.com"},
  {"name":"Southgate Mall","city":"Missoula","state":"MT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US Hwy. 93 & South Ave., Missoula, MT 59801","phone":"","email":"","website":"http://www.shopsouthgate.com"},
  {"name":"Concord Mills","city":"Concord","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"8111 Concord Mills Blvd, Concord, NC 28027","phone":"(704) 979-0001","email":"","website":""},
  {"name":"Crabtree Valley Mall","city":"Raleigh","state":"NC","hasSmarteCarte":true,"type":"enclosed mall","owner":"CBL & Associates","operatedBy":"CBL & Associates","address":"US 70 (Glenwood Ave.) & Raleigh Beltline (I-440), Raleigh, NC 27612","phone":"","email":"","website":"http://www.crabtree-valley-mall.com"},
  {"name":"Hanes Mall","city":"Winston-Salem","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 @ Hanes Mall Blvd., Winston-Salem, NC 27103","phone":"","email":"","website":"http://www.shophanesmall.com"},
  {"name":"SouthPark","city":"Charlotte","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Sharon & Fairview Rds., Charlotte, NC 28211","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Streets at Southpoint","city":"Durham","state":"NC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Kirkwood Mall","city":"Bismarck","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"7th St. & Bismarck Expwy., Bismarck, ND 58504","phone":"","email":"","website":"http://www.shopkirkwoodmall.com"},
  {"name":"West Acres Shopping Center","city":"Fargo","state":"ND","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-29 & 13th Ave. South, Fargo, ND 58103","phone":"","email":"","website":"http://www.westacres.com"},
  {"name":"Gateway Mall","city":"Lincoln","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"61st & O St., Lincoln, NE 68505","phone":"","email":"","website":"http://www.westfield.com/gateway"},
  {"name":"Westroads Mall","city":"Omaha","state":"NE","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dodge St. & I-680, Omaha, NE 68114","phone":"","email":"","website":"http://www.westroadsmall.com"},
  {"name":"Pheasant Lane Mall","city":"Nashua","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Daniel Webster Hwy. & Rt. 3, Nashua, NH 03060","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Mall at Rockingham Park","city":"Salem","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rte. 93 & Rockingham Park Blvd., Salem, NH 03079","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Mall of New Hampshire","city":"Manchester","state":"NH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-293 & S. Willow St. (Rt. 28), Manchester, NH 03103","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"American Dream","city":"East Rutherford","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Triple Five Group","operatedBy":"Triple Five Group","address":"1 American Dream Way, East Rutherford, NJ 07073","phone":"","email":"","website":"https://www.americandream.com/directory/shopping"},
  {"name":"Cherry Hill Mall","city":"Cherry Hill","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rt. 38 & Haddonfield Rd., Cherry Hill, NJ 08002","phone":"","email":"","website":"http://www.cherryhillmall.com"},
  {"name":"Deptford Mall","city":"Deptford","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1750 Deptford Center Rd, Deptford, NJ 08096","phone":"(856) 848-0400","email":"","website":"http://www.deptfordmall.com"},
  {"name":"Freehold Raceway Mall","city":"Freehold","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"3710 US-9, Freehold, NJ 07728","phone":"(732) 577-1144","email":"","website":"http://www.freeholdracewaymall.com"},
  {"name":"Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":"","website":"http://www.westfield.com/gardenstateplaza"},
  {"name":"The Mills at Jersey Gardens","city":"","state":"NJ","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Exit 13 A,New Jersey Turnpike, Elizabeth, NJ 07201","phone":"","email":"","website":"http://www.jerseygardens.com"},
  {"name":"Westfield Garden State Plaza","city":"Paramus","state":"NJ","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"One Garden State Plaza, Paramus, NJ 07652","phone":"(201) 843-2121","email":"","website":"http://www.westfield.com/gardenstateplaza"},
  {"name":"ABQ Uptown","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Coronado Center","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Louisiana & Menaul Blvd., Albuquerque, NM 87110","phone":"","email":"","website":"http://www.coronadocenter.com"},
  {"name":"Cottonwood Mall","city":"Albuquerque","state":"NM","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Coors Bypass/NW & 7 Bar Loop Rd./SE, Albuquerque, NM 87114","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Rio West Mall","city":"","state":"NM","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 & US Hwy. 666, Gallup, NM 87301","phone":"","email":"","website":"http://www.riowestmall.com"},
  {"name":"Boulevard Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Maryland Pkwy. btwn. Desert Inn Rd. & Twain, Las Vegas, NV 89169","phone":"","email":"","website":"http://www.blvdmall.com"},
  {"name":"Fashion Show","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Las Vegas Blvd. & Spring Mountain Rd., Las Vegas, NV 89109","phone":"","email":"","website":"http://www.thefashionshow.com"},
  {"name":"Galleria at Sunset","city":"Henderson","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Stephanie St. & Sunset Rd., Henderson, NV 89014","phone":"","email":"","website":"http://www.galleriaatsunset.com"},
  {"name":"Meadows Mall","city":"Las Vegas","state":"NV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"US 95 & Valley View Blvd., Las Vegas, NV 89107","phone":"","email":"","website":"http://www.meadowsmall.com"},
  {"name":"Chelsea Market","city":"New York","state":"NY","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Crossgates Mall","city":"Albany","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-87 & I-90, Albany, NY 12203","phone":"","email":"","website":"http://www.shopcrossgates.com"},
  {"name":"Destiny USA","city":"Syracuse","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Pyramid Management","operatedBy":"Pyramid Management","address":"","phone":"","email":"","website":""},
  {"name":"Fashion Outlets - Niagara Falls","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Niagara Falls Blvd. & Military Rd., Niagara Falls, NY 14304","phone":"","email":"","website":"http://www.fashionoutletsniagara.com"},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"2034 Green Acres Mall, Valley Stream, NY 11581","phone":"(516) 561-1157","email":"","website":"http://www.greenacresmallonline.com"},
  {"name":"Green Acres Mall","city":"Valley Stream","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"2034 Green Acres Mall, Valley Stream, NY 11581","phone":"(516) 561-1157","email":"","website":"http://www.greenacresmallonline.com"},
  {"name":"Kings Plaza Shopping Center","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Flatbush Ave. & Ave. U, Brooklyn, NY 11234","phone":"","email":"","website":"http://www.kingsplazaonline.com"},
  {"name":"Queens Center","city":"Elmhurst","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Queens Blvd. @ Woodhaven Blvd. & L.I.E., Elmhurst, NY 11373","phone":"","email":"","website":"http://www.shopqueenscenter.com"},
  {"name":"Roosevelt Field","city":"Garden City","state":"NY","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Old Country Rd. & Meadowbrook, Garden City, NY 11530","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Wilton Mall at Saratoga","city":"","state":"NY","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Weibel Ave. & Rt. 50, Saratoga Springs, NY 12866","phone":"","email":"","website":"http://www.wiltonmall.com"},
  {"name":"Cincinnati Premium Outlets","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-275 @ Winton Rd., Cincinnati, OH 45240","phone":"","email":"","website":"http://www.blueridgecapital.com"},
  {"name":"Eastgate Mall","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-275 & State Rts. 32 & 74, Cincinnati, OH 45245","phone":"","email":"","website":"http://www.shopeastgate-mall.com"},
  {"name":"Easton Town Center","city":"Columbus","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Eastwood Mall Complex","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR 46 & US Rt. 422, Niles, OH 44446-4897","phone":"","email":"","website":"http://www.eastwoodmall.com"},
  {"name":"Findlay Market","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Kenwood Towne Centre","city":"Cincinnati","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kenwood, Montgomery, & Galbraith Rds., Cincinnati, OH 45236","phone":"","email":"","website":"http://www.kenwoodtownecenter.com"},
  {"name":"SouthPark Mall","city":"Strongsville","state":"OH","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-71 @ Route 82, Strongsville, OH 44136","phone":"","email":"","website":"http://www.westfield.com/southpark"},
  {"name":"Summit Mall","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"SR. 18 & Ghent Rd., Akron, OH 44333","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Tuttle Crossing (The Mall at)","city":"","state":"OH","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-270 & Tuttle Crossing Interchange, Dublin, OH 43016","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"West Side Market","city":"Cleveland","state":"OH","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Penn Square Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Northwest Expwy. & N. Pennsylvania Ave., Oklahoma City, OK 73118","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Quail Springs Mall","city":"Oklahoma City","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Memorial Rd. btwn. May & Penn Aves., Oklahoma City, OK 73134","phone":"","email":"","website":"http://www.quailspringsmall.com"},
  {"name":"Woodland Hills Mall","city":"Tulsa","state":"OK","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"S. Memorial Dr. & 71st St., Tulsa, OK 74133","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Woodland Hills Mall","city":"","state":"OK","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"S. Memorial Dr. & 71st St., Tulsa, OK 74133","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Clackamas Town Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Fubonn Shopping Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Lloyd Center","city":"Portland","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Valley River Center","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Valley River Drive & Delta Hwy., Eugene, OR 97401","phone":"","email":"","website":"http://www.valleyrivercenter.com"},
  {"name":"Washington Square","city":"Tigard","state":"OR","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 217 & Greenburg Rd., Tigard, OR 97223","phone":"","email":"","website":"http://www.shopwashingtonsquare.com"},
  {"name":"Washington Square","city":"","state":"OR","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 217 & Greenburg Rd., Tigard, OR 97223","phone":"","email":"","website":"http://www.shopwashingtonsquare.com"},
  {"name":"Franklin Mills, PA (FKA Philadelphia Mills)","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Woodhaven & Knights Rds., Philadelphia, PA 19154","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Grove City Premium Outlets","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"King of Prussia Mall","city":"King of Prussia","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Rts. 202 & Schuykill Expwy., King of Prussia, PA 19406","phone":"","email":"","website":"http://www.kingofprussiamall.com"},
  {"name":"Millcreek Mall","city":"","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Interchange Rd. & Peachstreet (I79, Exit 180), Erie, PA 16565","phone":"","email":"","website":"http://www.millcreekmall.net"},
  {"name":"Reading Terminal Market","city":"Philadelphia","state":"PA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"Ross Park Mall","city":"Pittsburgh","state":"PA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"McKnight Rd. & Siebert Rd. N/E, Pittsburgh, PA 15237","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Mall at Robinson","city":"Robinson Township","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-376 & Robinson Town Centre Blvd., Robinson, PA 15205","phone":"","email":"","website":"http://www.shoprobinsonmall.com"},
  {"name":"Willow Grove Park","city":"Willow Grove","state":"PA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Moreland, Easton, Old Welsh, Willow Grove, PA 19090","phone":"","email":"","website":"http://www.willowgroveparkmall.com"},
  {"name":"Providence Place","city":"Providence","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Francis St., I-95 & Memorial Blvd., Providence, RI 02903","phone":"","email":"","website":"http://www.providenceplace.com"},
  {"name":"Warwick Mall","city":"Warwick","state":"RI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rts. 2 & 5, Warwick, RI 02886","phone":"","email":"","website":"http://www.warwickmall.com"},
  {"name":"Coastal Grand Mall","city":"Myrtle Beach","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Highway 17 By-Pass & Highway 501, Myrtle Beach, SC 29577","phone":"","email":"","website":"http://www.coastalgrand.com"},
  {"name":"Columbiana Centre","city":"Columbia","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-26 & Harbison Blvd., Columbia, SC 29212","phone":"","email":"","website":"http://www.columbianacentre.com"},
  {"name":"Haywood Mall","city":"Greenville","state":"SC","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"I-385 N. & Haywood Rd., Greenville, SC 29607","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Empire Mall (The)","city":"Sioux Falls","state":"SD","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Louise Ave & 41st St., Sioux Falls, SD 57106-6523","phone":"","email":"","website":"http://www.theempiremall.com"},
  {"name":"Rushmore Mall","city":"Rapid City","state":"SD","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"LaCrosse St. & Haines Ave., Rapid City, SD 57701","phone":"","email":"","website":"http://www.rushmoremall.com"},
  {"name":"Assembly Food Hall","city":"Nashville","state":"TN","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"CoolSprings Galleria","city":"Franklin","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-65 & Galleria Blvd., Franklin, TN 37067","phone":"","email":"","website":"http://www.coolspringsgalleria.com"},
  {"name":"Opry Mills","city":"Nashville","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Two Rivers Pkwy. & McGavock Pike, Nashville, TN 37214","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Stones River Mall","city":"","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 96, Old Fort Pkwy. & I-24, Murfreesboro, TN 37129","phone":"","email":"","website":"http://www.stonesrivermall.com"},
  {"name":"West Town Mall","city":"Knoxville","state":"TN","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Kingston Pike & Montvue Rd., Knoxville, TN 37919","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Wolfchase Galleria","city":"Memphis","state":"TN","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-40 & Germantown Pkwy., Memphis, TN 38133","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Almeda Mall","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Independent","operatedBy":"Independent","address":"Gulf Frwy. @ Almeda Genoa, Houston, TX 77075","phone":"","email":"","website":"http://www.almedamall.com"},
  {"name":"Barton Creek Square","city":"Austin","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"2901 S Capital of Texas Hwy, Austin, TX 78746","phone":"(512) 327-7041","email":"","website":"http://www.simon.com"},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"4601 S Broadway Ave, Tyler, TX 75703","phone":"(903) 561-7055","email":"","website":"http://www.simon.com"},
  {"name":"Broadway Square Mall","city":"Tyler","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"4601 S Broadway Ave, Tyler, TX 75703","phone":"(903) 561-7055","email":"","website":"http://www.simon.com"},
  {"name":"Cielo Vista Mall","city":"El Paso","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"8401 Gateway Blvd W, El Paso, TX 79925","phone":"(915) 779-7071","email":"","website":"http://www.simon.com"},
  {"name":"Grapevine Mills","city":"Grapevine","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3000 Grapevine Mills Pkwy, Grapevine, TX 76051","phone":"(972) 724-4910","email":"","website":"http://www.simon.com"},
  {"name":"Houston Galleria","city":"Houston","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"Post Oak Blvd. & Westheimer Rd., Houston, TX 77056","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Houston Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Post Oak Blvd. & Westheimer Rd., Houston, TX 77056","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Katy Mills","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-10 & Pin Oak Road, Katy, TX 77494","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"La Plaza Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"South 10th St. & Wichita Ave. NW., McAllen, TX 78503","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Lakeline Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Hwy. 183 & R.R. 620/NW, Cedar Park, TX 78613","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Memorial City Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Gessner Rd. & I-10 (Katy Fwy), Houston, TX 77024","phone":"","email":"","website":"http://www.memorialcitymall.com"},
  {"name":"Midland Park Mall","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 250 & Midkiff Rd./SW, Midland, TX 79705","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Music City Mall - Odessa TX","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"42nd St. & JBS Pkwy. & Tanglewood Blvd., Odessa, TX 79762","phone":"","email":"","website":"http://www.musiccitymall.net"},
  {"name":"North East Mall - Hurst","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 820 & Bedford Euless Rd., Hurst, TX 76053","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"North Star Mall","city":"San Antonio","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Loop 410 & San Pedro Ave., San Antonio, TX 78216","phone":"","email":"","website":"http://www.northstarmall.com"},
  {"name":"NorthPark Center","city":"Dallas","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"North Central Expwy. & Northwest Hwy.(Loop 12), Dallas, TX 75225","phone":"","email":"","website":"http://www.northparkcenter.com"},
  {"name":"Rivercenter","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"San Marcos Premium Outlets","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"South Plains Mall - Lubbock","city":"","state":"TX","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"South 10th St. & Wichita Ave. NW., McAllen, TX 78503","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"The Galleria","city":"Houston","state":"TX","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Gulf Frwy. @ Almeda Genoa, Houston, TX 77075","phone":"","email":"","website":"http://www.almedamall.com"},
  {"name":"City Creek Center","city":"Salt Lake City","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"","website":""},
  {"name":"Fashion Place","city":"Murray","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"State St.& Winchester, Murray, UT 84107","phone":"","email":"","website":"http://www.fashionplace.com"},
  {"name":"University Place","city":"Orem","state":"UT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"State St. & University Pkwy., Orem, UT 84097","phone":"","email":"","website":"http://www.shopuniversitymall.com"},
  {"name":"Valley Fair Mall","city":"","state":"UT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"3500 South & 2700 West, West Valley City, UT 84119","phone":"","email":"","website":"http://www.shopvalleyfairmall.com"},
  {"name":"MacArthur Center","city":"Norfolk","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Potomac Mills","city":"Woodbridge","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Simon Property Group","operatedBy":"Simon Property Group","address":"","phone":"","email":"","website":""},
  {"name":"Short Pump Town Center","city":"Richmond","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Spotsylvania Towne Centre","city":"","state":"VA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-95 & Rt. 3, Fredericksburg, VA 22407","phone":"","email":"","website":"http://www.spotsylvaniamall.com"},
  {"name":"Tysons Corner Center","city":"Tysons","state":"VA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Macerich","operatedBy":"Macerich","address":"1961 Chain Bridge Rd, Tysons, VA 22102","phone":"(703) 893-9401","email":"","website":"http://www.shoptysons.com"},
  {"name":"University Mall","city":"South Burlington","state":"VT","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dorset St. @ Williston Rd., South Burlington, VT 05403","phone":"","email":"","website":"http://www.umallvt.com"},
  {"name":"University Mall","city":"","state":"VT","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Dorset St. @ Williston Rd., South Burlington, VT 05403","phone":"","email":"","website":"http://www.umallvt.com"},
  {"name":"Alderwood","city":"Lynnwood","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Alderwood Mall Blvd. & 184th St. SW, Lynnwood, WA 98037","phone":"","email":"","website":"http://www.alderwoodmall.com"},
  {"name":"Bellevue Square","city":"Bellevue","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Bellevue Way, NE 8th & 4th Sts., 100th Ave., Bellevue, WA 98004","phone":"","email":"","website":"http://www.bellevuecollection.com"},
  {"name":"Northgate","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-5 & NE Northgate Way, Seattle, WA 98125","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Pike Place Market","city":"Seattle","state":"WA","hasSmarteCarte":false,"type":"indoor food hall","owner":"Independent","operatedBy":"Independent","address":"","phone":"","email":"","website":""},
  {"name":"South Hill Mall - Puyallup","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"Rts. 161 & 512, Puyallup, WA 98373","phone":"","email":"","website":"http://www.southhillmall.com"},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":"","website":"http://www.westfield.com/southcenter"},
  {"name":"Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":"","website":"http://www.westfield.com/southcenter"},
  {"name":"Tacoma Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"I-5 & Tacoma Mall Blvd., Tacoma, WA 98409","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Wenatchee Valley Mall","city":"","state":"WA","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"5th & Valley Mall Pkwy., E. Wenatchee, WA 98802","phone":"","email":"","website":"http://www.wenatcheevalleymall.com"},
  {"name":"Westfield Southcenter","city":"Tukwila","state":"WA","hasSmarteCarte":false,"type":"enclosed mall","owner":"Unibail-Rodamco-Westfield","operatedBy":"Unibail-Rodamco-Westfield","address":"2800 Southcenter Mall, Tukwila, WA 98188","phone":"","email":"","website":"http://www.westfield.com/southcenter"},
  {"name":"Bayshore","city":"Glendale","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"East Towne Mall","city":"Madison","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Eagan Rd. & E. Washington Ave., Madison, WI 53704","phone":"","email":"","website":"http://www.shopeasttowne-mall.com"},
  {"name":"Mayfair Mall","city":"Wauwatosa","state":"WI","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Mayfair Rd. (Hwy 100) & North Ave., Wauwatosa, WI 53226","phone":"","email":"","website":"http://www.mayfairmall.com"},
  {"name":"Miller Hill Mall","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"","phone":"","email":"","website":""},
  {"name":"Southridge Mall - Greendale","city":"","state":"WI","hasSmarteCarte":true,"type":"enclosed mall","owner":"","operatedBy":"","address":"S. 76th St. South of I-894, Greendale, WI 53129","phone":"","email":"","website":"http://www.simon.com"},
  {"name":"Charleston Town Center","city":"Charleston","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Court,Clendenin,Quarrier & Lee Sts., Charleston, WV 25389","phone":"","email":"","website":"http://www.charlestontowncenter.com"},
  {"name":"Huntington Mall","city":"Barboursville","state":"WV","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"IR 64 & Mall Rd., Barboursville, WV 25504","phone":"","email":"","website":"http://www.huntington-mall.com"},
  {"name":"Eastridge Mall","city":"Casper","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Wyoming Blvd. & East Second St., Casper, WY 82609","phone":"","email":"","website":"http://www.shopeastridge.com"},
  {"name":"Frontier Mall","city":"Cheyenne","state":"WY","hasSmarteCarte":false,"type":"enclosed mall","owner":"","operatedBy":"","address":"Powderhouse Rd. & Dell Range Blvd., Cheyenne, WY 82009","phone":"","email":"","website":"http://www.frontiermall.com"}
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
              {selected.website && <p style={{ margin: '0 0 8px' }}>Website: <a href={selected.website} target="_blank" rel="noreferrer">{selected.website}</a></p>}
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
