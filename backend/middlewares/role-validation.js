exports.IsResepsionis = async (request, response, next) => {
    if (request.user.role == "resepsionis") {
        next();
      }
      else{
          return response.status(401).json({
              success: false,
              auth: false,
              message: `Forbidden! You are Not resepsionis`
          })
      }
    }
    
  exports.IsAdmin = async (request, response, next) => {
      if (request.user.role == "admin") {
          next();
      }
      else{
          return response.status(401).json({
              success: false,
              auth: false,
              message: `Forbidden! You are Not Admin`
          })
      }
    }
  