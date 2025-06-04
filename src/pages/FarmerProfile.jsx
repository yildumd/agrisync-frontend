import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const FarmerProfile = () => {
  const { id } = useParams(); // this is the farmer userId from the URL
  const [farmer, setFarmer] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const q = query(collection(db, "farmers"), where("userId", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setFarmer(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error fetching farmer:", error);
      }
    };

    const fetchCrops = async () => {
      try {
        const q = query(collection(db, "crops"), where("userId", "==", id));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => doc.data());
        setCrops(fetched);
      } catch (error) {
        console.error("Error fetching crops:", error);
      }
    };

    fetchFarmer();
    fetchCrops();
    setLoading(false);
  }, [id]);

  if (loading) return <p>Loading profile...</p>;
  if (!farmer) return <p>Farmer not found.</p>;

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <img
            src={farmer.photo || "https://via.placeholder.com/100"}
            alt={farmer.name}
            className="w-20 h-20 rounded-full object-cover border"
          />
          <div>
            <h2 className="text-2xl font-bold text-green-800">{farmer.name}</h2>
            <p className="text-gray-600">{farmer.location}</p>
            <p className="text-gray-500 text-sm">📞 {farmer.phone}</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">🌿 Crops</h3>
          {crops.length > 0 ? (
            <ul className="list-disc ml-5">
              {crops.map((crop, index) => (
                <li key={index}>
                  {crop.cropName} - {crop.quantity} kg
                </li>
              ))}
            </ul>
          ) : (
            <p>No crops listed.</p>
          )}
        </div>

        {currentUser?.role === "buyer" && (
          <div className="mt-6">
            <a
              href={`/chat/${id}`}
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700"
            >
              💬 Message Farmer
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerProfile;
