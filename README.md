## Microservices repository 
 

### 1. GenieBaddy

**This clean the  un selected chats after 10 minutes  that somw genies allredy see but didnt select .**

***Run it by tiping:***

> cd gb
> node server.js     \OR   npm start



### 2. Split Transit to Tables

**This ms splits the data from transit table into resources and trips tables.**

***Run it by tiping:***

> cd ./split_transit_to_tables
> npm start
> Go to http://localhost:8081/run


### 3. Update Resource Trip data

**This ms updates the trip data from trips table. The columns that updates are:**
- resource_status
- current_trip_id
- current_trip_name
- current_trip_start_time
- current_trip_end_time
- next_trip_id
- next_trip_name

***Run it by tiping:***

> cd ./update_resource_trip_data
> npm start
> Go to http://localhost:8082/run


### 4. Update Location info Ituran

**This ms inserts data into location_info table from Ituran. It also adds new resource with type car (if plate number is not found), or updates resource location by columns:**

- latitude
- longitude
- position_last_update
- position_source

***Run it by tiping:***

> cd ./update_location_info_ituran
> npm start
> Go to http://localhost:8083/run



### 5. Move old data to history tables

**This ms moves data from tables location_info, resources, trips, transit to the same tables, but with '_history' at the end. There is config how old data to move - in config.json**

***Run it by tiping:***

> cd ./move_old_data_to_history_tables
> npm start
> Go to http://localhost:8084/run



### 6. Update car size data for Resources

**This ms updates resource_size and car_seats data in resources. It gets the data from table cartypes**

***Run it by tiping:***

> cd ./update_car_size
> npm start
> Go to http://localhost:8085/run

