const APIKey = "1fa3554e6f15319351df246e6a56c494";
const formatTemp = (temp) => `${temp?.toFixed(1)}°`
const createIconURL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`
const WeekDays = ["Sun", "Mon", "Tues", "Wed", "Thu", "Fri", "Sat"];
let CityValue;
const defaultCity = {name: "Mumbai"}
let City;
// to avoid keep making request on every input we set a debounce function
// which will make a request only when user stops typing (after 0.3 sec)

const getCurrentWeatherData = async({lat, lon, name: City}) => {
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${APIKey}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${City}&appid=${APIKey}&units=metric`
    const response =  await fetch(url);
    return response.json();
}

const loadCurrentData  = async({name, main: {temp, temp_min, temp_max}, weather: [{description}]}) => {
    const currentWeather = document.getElementById("currentForecast");
    currentWeather.querySelector(".city").textContent = name
    currentWeather.querySelector(".temp").textContent = formatTemp(temp);
    currentWeather.querySelector(".description").textContent = description;
    currentWeather.querySelector(".min-max-temp").textContent = "Min = "+formatTemp(temp_min) + " Max = "+formatTemp(temp_max);
}

const getHourlyForeCast  = async ({lat, lon, name: City}) => {
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${APIKey}&units=metric` : `https://api.openweathermap.org/data/2.5/forecast?q=${City}&appid=${APIKey}&units=metric`; 
    const response = await fetch(url);
    const data = await response.json();
    // console.log(data);
    return data.list.map(data => {
        const { main: {temp, temp_max, temp_min}, dt, dt_txt, weather: [{description, icon}]} = data;
        return {temp, temp_max, temp_min, dt, dt_txt, description, icon};
    });
    // data.list is an array so we map into another which contains only our useful information
}

const loadHourlyForecast = (forecast, {main: {temp: tempNow}, weather: [{icon : iconNow}]}) => {
    const hourlyContainer = document.querySelector(".hourlyContainer");
    const forecastof12Hours = forecast.slice(2, 13);
    const TimeFormater = Intl.DateTimeFormat("en", {
        hour12: true, 
        hour: "numeric"
    });
    let innerHTMLstring = 
    `<article>
    <h3 class="time">Now</h3>
    <img src=${createIconURL(iconNow)} alt="Icon of weather" class="icon">
    <p class="temp">${formatTemp(tempNow)}</p>
    </article>`;
    
    for (let {dt_txt, icon, temp} of forecastof12Hours){
        innerHTMLstring += 
        `<article>
        <h3 class="time">${TimeFormater.format(new Date(dt_txt))}</h3>
        <img src=${createIconURL(icon)} alt="${icon}" class="icon">
        <p class="temp">${formatTemp(temp)}</p>
        </article>`
        
    }
    hourlyContainer.innerHTML = innerHTMLstring;
    
}

const loadFeelsLike  = ({main : {feels_like}}) =>{
    const feelsLikeContainer = document.getElementById("feelsLike");
    const feelsTemp = feelsLikeContainer.querySelector(".feelsLikeTemp");
    feelsTemp.textContent = formatTemp(feels_like);
}

const loadHumidity = ({main: {humidity}}) =>{
    const humidityContainer = document.getElementById("humidity");
    const humValue = humidityContainer.querySelector(".value");
    humValue.textContent = `${humidity} %`;
}

const getDayWiseForecast = (forecast) =>{
    let dayWiseForecast = new Map();
    for (let dayForecast of forecast){
        let date = dayForecast.dt_txt.split(" ")[0];
        const dayOfWeek = WeekDays[new Date(date).getDay()];
        // new Date gives info of current date with day time date...
        // getDay gives day no(int)
        
        if(dayWiseForecast.has(dayOfWeek)){
            let existingForecast = dayWiseForecast.get(dayOfWeek);
            existingForecast.push(dayForecast);
            dayWiseForecast.set(dayOfWeek, existingForecast);
        }
        else{
            dayWiseForecast.set(dayOfWeek, [dayForecast] );
        }
    }
    // console.log(dayWiseForecast)
    for (let [keys, value] of dayWiseForecast){
        const temp_min = Math.min(...Array.from(value, val => val.temp_min));
        const temp_max = Math.max(...Array.from(value, val => val.temp_max));
        
        dayWiseForecast.set(keys, {temp_min, temp_max, icon: value[0].icon});
        
    }
    //  console.log(dayWiseForecast);
    return dayWiseForecast;
}

const loadFiveDayForecast = (forecast) =>{
    const fiveDayContainer = document.querySelector(".fiveDayForecastContainer");
    const dayWiseForecast = getDayWiseForecast(forecast) 
    // console.log(dayWiseForecast);
    let dayWiseInfo = ``;
    
    Array.from(dayWiseForecast).map(([day , {temp_min, temp_max, icon}], index) => {
        if(index<5){
            dayWiseInfo += `
            <article class="dayWiseForecast">    
            <h3 class="day">${index === 0 ? "Today" : day}</h3>
            <img src=${createIconURL(icon)} alt="icon" class="icon">
            <p class="minTemp">${formatTemp(temp_min)}</p>
            <p class="maxTemp">${formatTemp(temp_max)}</p>
            </article>`
        }
    });
    fiveDayContainer.innerHTML = dayWiseInfo; 
}

const loadData = async()=>{
    const currentWeather = await getCurrentWeatherData(City);
    // console.log(currentWeather);
    loadCurrentData(currentWeather);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
    const hourlyForecast  = await getHourlyForeCast(City);
    // console.log(hourlyForecast);
    loadHourlyForecast(hourlyForecast, currentWeather);
    loadFiveDayForecast(hourlyForecast);
}

function debounce(func){
    let Timer;
    return (...args) => {
        clearTimeout(Timer); //clear existing timer
        // create a new timeout till user types
        Timer = setTimeout(()=>{
            func.apply(this, args);
        }, 300)
    }
}

const getCities = async (searchText) => {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${APIKey}`)
    return response.json();
}

const onInputChanges = async (event) => {
    const {value} = event.target;
    if(!value){
        CityValue = "";
        City = defaultCity;
    }
    if(value && CityValue!= value){
        const cities = await getCities(value);
        // console.log(cities);
        let optionsList = document.querySelector("#cities");
        let options = ``;
        for(let {lat, lon, name, state, country} of cities){
            options += `<option details = '${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`
        }
        optionsList.innerHTML = options;
    }

}

const onCitySelection = (event) => {
    const selectedCity = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    // console.log(options);
    if(options?.length){
        CityValue = Array.from(options).find(opt => opt.value = selectedCity);
        City = JSON.parse(CityValue.getAttribute("details"));
        // console.log(City);
        loadData()
    }
}

const useForecastusingCurrentLocation = () =>{
    navigator.geolocation.getCurrentPosition(({coords}) => {
        const {latitude: lat, longitude: lon} = coords;
        City = {lat, lon};
        loadData();
    }, error=> {
        console.log(error);
        City = defaultCity;
        loadData();
        })
};

const debounceSearch = debounce((event)=> onInputChanges(event))

document.addEventListener("DOMContentLoaded", async()=>{

    useForecastusingCurrentLocation();
    const searchBox = document.querySelector("#search");
    searchBox.addEventListener("input", debounceSearch);
    searchBox.addEventListener("change", onCitySelection);
    
});

