package service

import (
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/atopos31/stoz/common"
)

type ZimaOSDevice struct {
	DeviceModel string   `json:"device_model"`
	DeviceName  string   `json:"device_name"`
	Hash        string   `json:"hash"`
	Initialized bool     `json:"initialized"`
	LanIPv4     []string `json:"lan_ipv4"`
	OSVersion   string   `json:"os_version"`
	Port        int      `json:"port"`
	RequestIP   string   `json:"request_ip"`
	IP          string   `json:"ip"`
	ImageURL    string   `json:"image_url"`
}

type DiscoveryService struct{}

func NewDiscoveryService() *DiscoveryService {
	return &DiscoveryService{}
}

func (s *DiscoveryService) DiscoverDevices(timeout time.Duration) ([]ZimaOSDevice, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get network interfaces: %w", err)
	}

	results := make(chan ZimaOSDevice, 100)
	var wg sync.WaitGroup
	seen := sync.Map{}

	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		if iface.Flags&net.FlagBroadcast == 0 {
			continue
		}

		wg.Add(1)
		go func(iface net.Interface) {
			defer wg.Done()
			s.discoverOnInterface(iface, timeout, results, &seen)
		}(iface)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var devices []ZimaOSDevice
	for device := range results {
		devices = append(devices, device)
	}

	return devices, nil
}

func (s *DiscoveryService) discoverOnInterface(iface net.Interface, timeout time.Duration, results chan<- ZimaOSDevice, seen *sync.Map) {
	addrs, err := iface.Addrs()
	if err != nil {
		common.Warnf("Failed to get addresses for interface %s: %v", iface.Name, err)
		return
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.To4() == nil {
			continue
		}

		if ipNet.IP.IsLoopback() {
			continue
		}

		broadcast := getBroadcastAddress(ipNet)
		if broadcast == nil {
			continue
		}

		common.Infof("Sending discovery broadcast on %s (%s) to %s:9527", iface.Name, ipNet.IP.String(), broadcast.String())

		conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: ipNet.IP, Port: 0})
		if err != nil {
			common.Warnf("Failed to create UDP socket on %s: %v", ipNet.IP.String(), err)
			continue
		}
		defer conn.Close()

		_, err = conn.WriteToUDP([]byte("9527"), &net.UDPAddr{IP: broadcast, Port: 9527})
		if err != nil {
			common.Warnf("Failed to send broadcast on %s: %v", iface.Name, err)
			continue
		}

		conn.SetReadDeadline(time.Now().Add(timeout))
		buf := make([]byte, 4096)

		for {
			n, remoteAddr, err := conn.ReadFromUDP(buf)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					break
				}
				common.Warnf("Failed to read UDP response: %v", err)
				break
			}

			var device ZimaOSDevice
			if err := json.Unmarshal(buf[:n], &device); err != nil {
				common.Warnf("Failed to parse device response from %s: %v", remoteAddr.IP.String(), err)
				continue
			}

			deviceKey := fmt.Sprintf("%s:%d", remoteAddr.IP.String(), device.Port)
			if _, loaded := seen.LoadOrStore(deviceKey, true); loaded {
				continue
			}

			device.IP = remoteAddr.IP.String()
			device.ImageURL = fmt.Sprintf("http://%s:%d/v2/zimaos/device/image?model=%s&type=client",
				remoteAddr.IP.String(), device.Port, device.DeviceModel)

			common.Infof("Discovered ZimaOS device: %s (%s) at %s:%d",
				device.DeviceName, device.DeviceModel, device.IP, device.Port)

			results <- device
		}
	}
}

func getBroadcastAddress(ipNet *net.IPNet) net.IP {
	ip := ipNet.IP.To4()
	if ip == nil {
		return nil
	}

	mask := ipNet.Mask
	if len(mask) != 4 {
		return nil
	}

	broadcast := make(net.IP, 4)
	for i := 0; i < 4; i++ {
		broadcast[i] = ip[i] | ^mask[i]
	}

	return broadcast
}
