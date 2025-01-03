import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Solución para iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const App = () => {
  const [vehicle, setVehicle] = useState("car");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [position, setPosition] = useState([
    -38.716666666667, -62.266666666667,
  ]); // iniciar el mapa en bahia
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");

  const handleMapClick = (event) => {
    const { lat, lng } = event.latlng;
    const newPoint = [lat, lng];
    setPoints((prevPoints) => [...prevPoints, newPoint]);
  };

  const handleMarkerDragEnd = (event, index) => {
    const { lat, lng } = event.target.getLatLng();
    setPoints((prevPoints) =>
      prevPoints.map((point, i) => (i === index ? [lat, lng] : point))
    );
  };

  const handleSearch = async () => {
    try {
      setError(null);
      const query = `${number} ${street}, ${city}`;
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: query,
            format: "json",
            addressdetails: 1,
            limit: 1,
          },
        }
      );

      const results = response.data;
      //console.log(response.data);

      if (results.length > 0) {
        const { lat, lon } = results[0]; // extrae las propiedades lat y lon del primer elemento del array results
        const newPoint = [parseFloat(lat), parseFloat(lon)]; // crea un nuevo array newPoint con la lat y long convertidas float
        setPosition(newPoint); // dibuja el nuevo Popup
        setPoints((prevPoints) => [...prevPoints, newPoint]); // agrega el nuevo punto a (newPoint) al array (prevPoints)
      } else {
        setError("no se encontraron resultados para la dirección ingresada.");
      }
    } catch (err) {
      console.error(err);
      setError("hubo un error al consultar la API de nominatim.");
    }
  };

  const handleCalculateRoute = async () => {
    if (points.length < 2) {
      setError("selecciona al menos dos puntos para calcular la ruta.");
      return;
    }

    try {
      setError(null);

      const apiKey = "ab303cdd-9694-4f58-b8fb-aba2e7412405"; // mi api key de graphhopper
      const url = `https://graphhopper.com/api/1/route?key=${apiKey}`;
      console.log(points);
      // extrae los datos y crea correctamente la peticion a graph
      const pointParams = points
        .map((point) => `point=${point.join(",")}`)
        .join("&");
      console.log(pointParams);
      const response = await axios.get(
        `${url}&${pointParams}&profile=${vehicle}&locale=es&calc_points=true`
      );

      const data = response.data;

      if (data.paths && data.paths.length > 0) {
        const path = data.paths[0];
        const decodedPoints = decodePolyline(path.points); // Decodifica la polilinea
        console.log(decodedPoints);
        setRoute(decodedPoints);
        setDistance((path.distance / 1000).toFixed(2)); // distancia en kilometros
      } else {
        setError("No se pudo calcular la ruta.");
      }
    } catch (err) {
      console.error(err);
      setError("Hubo un error al calcular la ruta con GraphHopper.");
    }
  };

  // codigo para decodificar los puntos con coordenadas geograficas, prepararlas para usarlas
  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
  };

  const handleGeocode = async () => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      setAddress(response.data.display_name);
    } catch (error) {
      console.error(error);
    }
  };

  // Resetear los puntos
  const resetPoints = () => {
    setPoints([]);
    setRoute([]);
    setDistance(null);
    setLatitude(null);
    setLongitude(null);
  };

  return (
    <div>
      <h3> front </h3>
      <div>
        <input
          type="text"
          placeholder="Calle"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
        />
        <input
          type="text"
          placeholder="Número"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <input
          type="text"
          placeholder="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <label>
          Tipo de Vehículo:{" "}
          <select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            <option value="car">Auto</option>
            <option value="truck">Camión</option>
          </select>
        </label>
        <button onClick={handleSearch}>Buscar</button>
        <button onClick={handleCalculateRoute} style={{ marginLeft: "10px" }}>
          Calcular Ruta
        </button>
        <button onClick={resetPoints} style={{ marginLeft: "10px" }}>
          Resetear Ruta
        </button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Latitud"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
        />
        <input
          type="text"
          placeholder="Longitud"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
        />
        <button onClick={handleGeocode}>Buscar</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {distance && <p>Distancia de la Ruta: {distance} km</p>}

      <div style={{ height: "80vh", marginTop: "20px" }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          onClick={handleMapClick}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((point, index) => (
            <Marker
              position={point}
              key={index}
              draggable={true}
              eventHandlers={{
                dragend: (event) => handleMarkerDragEnd(event, index),
              }}
            >
              <Popup>Punto {index + 1}</Popup>
            </Marker>
          ))}
          {latitude && longitude && (
            <Marker position={[latitude, longitude]}>
              <Popup>{address}</Popup>
            </Marker>
          )}
          {route.length > 0 && <Polyline positions={route} color="blue" />}
        </MapContainer>
      </div>
    </div>
  );
};

export default App;

