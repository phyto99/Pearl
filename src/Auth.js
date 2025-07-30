import React from "react";

const Home = () => {
  return (
    <div className="Auth">
      <div style={{ fontSize: '16px', color: '#666' }}>
        Local Mode - No Authentication
      </div>
      <style jsx>{`
        .Auth {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default Home;
