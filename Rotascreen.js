// RotaScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';


const RotaScreen = () => {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);

  const getCoordinates = async (place) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`, {
      headers: {
        'User-Agent': 'ReactNativeApp/1.0 (your@email.com)', // burayı bir mail adresiyle doldur, rastgele de olur
        'Accept-Language': 'tr', // Türkçe sonuçlar için
      },
    });

    const data = await response.json();

    if (data.length > 0) {
      const { lat, lon } = data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } else {
      alert(`${place} için konum bulunamadı`);
      return null;
    }
  } catch (error) {
    console.error('Koordinat alma hatası:', error);
    alert('Konum alınırken hata oluştu');
    return null;
  }
};

  const fetchRoute = async () => {
  if (!startCoords || !endCoords) return;

  setLoading(true);

  const start = `${startCoords.longitude},${startCoords.latitude}`;
  const end = `${endCoords.longitude},${endCoords.latitude}`;
  const apiKey = '5b3ce3597851110001cf62486b97f89242ab4870addb886b839f229f';
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start}&end=${end}`;

  try {
    const res = await axios.get(url);

    const coords = res.data.features[0].geometry.coordinates.map(point => ({
      latitude: point[1],
      longitude: point[0],
    }));

    setRouteCoords(coords);
  } catch (error) {
    console.error('Rota verisi alınamadı:', error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
};

  const handleSearch = async () => {
    Keyboard.dismiss();
    const start = await getCoordinates(startInput);
    const end = await getCoordinates(endInput);

    if (start && end) {
      setStartCoords(start);
      setEndCoords(end);
    } else {
      alert("Başlangıç veya varış noktası bulunamadı.");
    }
  };

  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [startCoords, endCoords]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Başlangıç noktası"
          style={styles.input}
          value={startInput}
          onChangeText={setStartInput}
        />
        <TextInput
          placeholder="Varış noktası"
          style={styles.input}
          value={endInput}
          onChangeText={setEndInput}
        />
        <Button title="Rota Göster" onPress={handleSearch} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <MapView
          style={styles.map}
          region={
            startCoords
              ? {
                  latitude: startCoords.latitude,
                  longitude: startCoords.longitude,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }
              : {
                  latitude: 39.925,
                  longitude: 32.8369,
                  latitudeDelta: 5,
                  longitudeDelta: 5,
                }
          }
        >
          {startCoords && <Marker coordinate={startCoords} title="Başlangıç" />}
          {endCoords && <Marker coordinate={endCoords} title="Varış" />}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="blue" />
          )}
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: 10,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  input: {
    backgroundColor: '#eee',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  map: {
    flex: 1,
  },
});

export default RotaScreen;