import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions
} from "react-native";
import { fonts } from "../theme/fonts";

const { width } = Dimensions.get("window");

export default function LandingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* 🏥 REAL CLINIC HERO SECTION */}
      <View style={styles.imageWrapper}>
        <Image 
          // 🔹 Dummy picture of a modern dental clinic
          source={require('../../assets/clinic-image.jpg')} 
          style={styles.clinicImage} 
        />
        <View style={styles.imageOverlay} />
      </View>

      {/* 📄 CONTENT SECTION */}
      <View style={styles.content}>
        <View style={styles.textGroup}>
          <Text style={styles.brand}>OraVista</Text>
          <Text style={styles.title}>Your Journey to a{"\n"}Healthy Smile Starts Here</Text>
          <Text style={styles.desc}>
            Experience professional dental care at King Epres Dental Clinic. 
            Quality service, accessible to everyone.
          </Text>
        </View>

        {/* 🔘 ACTION BUTTONS */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.replace("Login")}
          >
            <Text style={styles.loginText}>Login to Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={styles.registerText}>
              New here? <Text style={styles.registerLink}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.footerClinic}>King Epres Dental Clinic</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  imageWrapper: {
    height: "45%",
    width: "100%",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  clinicImage: {
    width: "100%",
    height: "100%",
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 17, 102, 0.25)',
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  textGroup: {
    alignItems: 'center',
  },
  brand: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#001166",
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
    lineHeight: 36,
  },
  desc: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 16,
    fontFamily: fonts.medium,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  buttonGroup: {
    width: "100%",
    gap: 16,
  },
  loginBtn: {
    backgroundColor: "#001166",
    paddingVertical: 18,
    borderRadius: 999, 
    width: "100%",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  loginText: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  registerBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  registerText: {
    color: "#6B7280",
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  registerLink: {
    color: "#001166",
    fontFamily: fonts.bold,
  },
  footerClinic: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fonts.bold,
    color: '#D1D5DB',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});