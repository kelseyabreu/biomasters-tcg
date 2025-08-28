// Debug script to check species data structure
// Updated to use fetch from public/species directory

export async function debugGrassData() {
  try {
    const response = await fetch('/species/grass.json');
    if (!response.ok) {
      console.error('Failed to load grass data:', response.status);
      return null;
    }

    const grassData = await response.json();
    console.log('Grass data structure:', grassData);
    console.log('Has identity?', !!grassData.identity);
    console.log('Has taxonomy?', !!grassData.identity?.taxonomy);
    console.log('Kingdom:', grassData.identity?.taxonomy?.kingdom);

    return grassData;
  } catch (error) {
    console.error('Error loading grass data:', error);
    return null;
  }
}
