
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';


export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Burasi Home Screen!</Text>
      <Button 
        color="black"
        title="Hakkımızda Sayfasına Git"
        onPress={() => navigation.navigate('Rota')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
