// RotaScreen.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Keyboard, Platform, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location'; // expo-location kütüphanesini import et

const RotaScreen = () => {
  const [startInput, setStartInput] = useState('Konum alınıyor...'); // Başlangıçta konum alınıyor mesajı
  const [endInput, setEndInput] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true); // Konum yükleme durumu
  const [locationSubscription, setLocationSubscription] = useState(null); // Konum takip aboneliği

  // Koordinatlardan adres bulan fonksiyon (Reverse Geocoding)
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'ReactNativeApp/1.0 (your@email.com)', // Burayı kendi mail adresinle doldur
          'Accept-Language': 'tr', // Türkçe sonuçlar için
        },
      });
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${latitude}, ${longitude}`; // Adres bulunamazsa koordinatları göster
    } catch (error) {
      console.error('Adres alma hatası (Reverse Geocoding):', error);
      return `${latitude}, ${longitude}`;
    }
  };

  // Adresten koordinat bulan fonksiyon (Geocoding)
  const geocodeAddress = async (place) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`, {
        headers: {
          'User-Agent': 'ReactNativeApp/1.0 (your@email.com)', // Burayı kendi mail adresinle doldur
          'Accept-Language': 'tr', // Türkçe sonuçlar için
        },
      });

      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
      } else {
        Alert.alert('Konum Bulunamadı', `${place} için konum bulunamadı.`);
        return null;
      }
    } catch (error) {
      console.error('Koordinat alma hatası:', error);
      Alert.alert('Hata', 'Konum alınırken hata oluştu.');
      return null;
    }
  };

  // Cihazın mevcut konumunu sürekli olarak alan fonksiyon
  const startLocationTracking = async () => {
    setLocationLoading(true);
    // Konum izni iste
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Konum İzni Gerekli', 'Uygulamanın konumunuza erişebilmesi için izin vermeniz gerekmektedir.');
      setLocationLoading(false);
      return;
    }

    try {
      // Mevcut konumu sürekli olarak izle
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High, // Yüksek doğruluk
          timeInterval: 5000, // 5 saniyede bir güncelleme (isteğe bağlı, daha sık veya seyrek olabilir)
          distanceInterval: 10, // 10 metre hareket edildiğinde güncelleme (isteğe bağlı)
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          const currentCoords = { latitude, longitude };
          setStartCoords(currentCoords);
          const address = await reverseGeocode(latitude, longitude);
          setStartInput(address); // Başlangıç input'unu adresle doldur
          setLocationLoading(false); // İlk konum alındığında yükleme durumunu kapat
        }
      );
      setLocationSubscription(subscription); // Aboneliği state'e kaydet
    } catch (error) {
      console.error('Konum takibi başlatılamadı:', error);
      Alert.alert('Konum Hatası', 'Mevcut konumunuz alınamadı veya takip başlatılamadı. Konum servislerinin açık olduğundan emin olun.');
      setLocationLoading(false);
    }
  };

  // Rota verisini çeken fonksiyon
  const fetchRoute = async () => {
    if (!startCoords || !endCoords) return;

    setLoading(true);

    const start = `${startCoords.longitude},${startCoords.latitude}`;
    const end = `${endCoords.longitude},${endCoords.latitude}`;
    const apiKey = '5b3ce3597851110001cf62486b97f89242ab4870addb886b839f229f'; // Kendi OpenRouteService API anahtarın
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
      Alert.alert('Rota Hatası', 'Rota verisi alınırken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Arama butonuna basıldığında tetiklenen fonksiyon
  const handleSearch = async () => {
    Keyboard.dismiss();
    if (!startCoords) {
      Alert.alert('Konum Gerekli', 'Lütfen mevcut konumunuzun alınmasını bekleyin veya manuel olarak başlangıç noktası girin.');
      return;
    }

    const end = await geocodeAddress(endInput);

    if (end) {
      setEndCoords(end);
    } else {
      Alert.alert("Hata", "Varış noktası bulunamadı.");
    }
  };

  // Uygulama yüklendiğinde mevcut konumu al ve sürekli takip et
  useEffect(() => {
    startLocationTracking();

    // Component unmount edildiğinde konum takibini durdur
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
    };
  }, []); // Sadece bir kez çalışır

  // Başlangıç veya bitiş koordinatları değiştiğinde rotayı çiz
  useEffect(() => {
    if (startCoords && endCoords) {
      fetchRoute();
    }
  }, [startCoords, endCoords]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Başlangıç noktası (Otomatik)"
          style={[styles.input, styles.readOnlyInput]}
          value={startInput}
          editable={false} // Otomatik konum alındığı için düzenlenemez yap
        />
        <TextInput
          placeholder="Varış noktası"
          style={styles.input}
          value={endInput}
          onChangeText={setEndInput}
        />
        <Button title="Rota Göster" onPress={handleSearch} disabled={loading || locationLoading} />
        {/* Konumu manuel olarak yenileme butonu artık daha az gerekli, ancak hala kullanılabilir */}
        <Button title="Konum Takibini Başlat/Yenile" onPress={startLocationTracking} disabled={loading} />
      </View>

      {loading || locationLoading ? (
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
                  latitude: 39.925, // Varsayılan konum (Ankara)
                  longitude: 32.8369,
                  latitudeDelta: 5,
                  longitudeDelta: 5,
                }
          }
        >
          {startCoords && <Marker coordinate={startCoords} title="Başlangıç (Mevcut Konum)" />}
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
  readOnlyInput: {
    color: '#555', // Okunabilir input için farklı bir renk
  },
  map: {
    flex: 1,
  },
});

export default RotaScreen;
