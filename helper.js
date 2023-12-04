
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKeyA = process.env.SUPABASE_ANON_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKeyA);
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export const SCRAPER_API_URL = process.env.SCRAPER_API_URL;
export const X_RAPID_API_KEY = process.env.X_RAPID_API_KEY;
export const X_RAPID_API_HOST = process.env.X_RAPID_API_HOST;

export const getAccount = async (account) => {
  const options = {
    method: 'GET',
    url: SCRAPER_API_URL,
    params: { ig: account, response_type: 'short', corsEnabled: 'true' },
    headers: {
      'X-RapidAPI-Key': X_RAPID_API_KEY,
      'X-RapidAPI-Host': X_RAPID_API_HOST,
    },
  };

  const userResults = await axios.request(options);

  return userResults;
};

// Function to fetch and upload image in subscriptions.js 183
export async function uploadImageFromURL(username, imageURL) {
  // console.log(username, imageURL);
  try {
    // Fetch image data from URL
    var response = imageURL && (await fetch(imageURL));
    if (!imageURL) {
      const r = await getAccount(username);
      response = await fetch(r.data?.[0]?.profile_pic_url);
    }
    // console.log("r: ",r);
    const imageData = await response?.blob();

    if (imageData) {
      // Upload image to Supabase storage
      const { data, error } = await supabase.storage
        .from('profilePictures')
        .upload(`${username}.jpg`, imageData, {
          upsert: true,
        });

      // if (error.message === 'The resource already exists') {
      //   return { status: 'success', data: {path: `${username}.jpg`}}
      // }
      if (error) {
        console.log(error);
        return { status: 'failed', data: error };
      } else {
        // console.log(`Image uploaded to ${data}`);
        const publicUrl = getDownloadedFilePublicUrl(data.path);
        // console.log("publicUrl: ", publicUrl?.data?.publicUrl)
        return { status: 'success', data: publicUrl?.data?.publicUrl };
      }
    }
  } catch (error) {
    console.log('uploadImageFromURLError: ', error);
  }
}

export function getDownloadedFilePublicUrl(path) {
  const publicUrl = supabase.storage.from('profilePictures').getPublicUrl(path);
  return publicUrl;
}

export function generateRandomPassword(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}