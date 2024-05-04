'use server';

import fetch from 'node-fetch';

export async function pingFlaskApi() {
  const flaskApiUrl = process.env.FLASK_API_URL;
  if (!flaskApiUrl) {
    throw new Error('FLASK_API_URL is not defined in environment variables');
  }

  // eslint-disable-next-line no-useless-catch
  try {
    const response = await fetch(flaskApiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Flask API: ${response.statusText}`);
    }
    const data = await response.json();
    return data; // Assuming the API returns JSON data
  } catch (error) {
    // Handle errors more specifically based on your needs
    throw error;
  }
}

export async function runModel(reviewId: string, formData: FormData) {
  const API_URL = 'https://thwcvf276mq5w9os.us-east-1.aws.endpoints.huggingface.cloud';

  // Extract the CSV file from the FormData object
  //const csvFile = formData.get('Visa.csv') as File;
  let csvContent = null;
  // Assume formData is your FormData object
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of [...formData.entries()]) {
    console.log('Key:', key);
    // If value is a File object, you might want to log its properties
    if (value instanceof File) {
      // eslint-disable-next-line no-await-in-loop
      csvContent = await value.text();
      console.log('File name:', value.name);
      console.log('File size:', value.size);
      console.log('File type:', value.type);
    } else {
      console.log('Value:', value);
    }
  }
  // Read the content of the CSV file

  // Send the CSV content directly in the body of the request
  const response = await fetch(API_URL, {
    method: 'POST',
    body: csvContent,
    headers: {
      'Content-Type': 'text/csv', // Specify the content type as CSV
      Authorization: 'Bearer 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',
    },
  });

  const result = await response.json();
  console.log(result);
}
